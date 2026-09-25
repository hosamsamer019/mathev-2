import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const AUTH = 'http://localhost:4001/api/auth';
const USERS = 'http://localhost:4002/api/users';
const NOTIFICATIONS = 'http://localhost:4002/api/notifications';

const TS = Date.now();
const results = [];
let passCount = 0;
let failCount = 0;

function assertTest(id, passed, detail) {
  if (passed) {
    passCount++;
    console.log(`✅ [PASS] ${id}: ${detail}`);
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${id}: ${detail}`);
  }
  results.push({ id, passed, detail });
}

async function loginAs(role, email, password = 'password123') {
  const r = await axios.post(`${AUTH}/login`, { email, password, role });
  return r.data;
}

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 RUNNING PHASE 1 NOTIFICATIONS TEST SUITE');
  console.log('=====================================================\n');

  try {
    // 1. Setup Test Users
    const adminLogin = await loginAs('ADMIN', 'admin@edu.com', '123456');
    const adminToken = adminLogin.token;

    const userA_email = `p1_userA_${TS}@test.com`;
    const userB_email = `p1_userB_${TS}@test.com`;

    const userARes = await axios.post(
      `${USERS}/users`,
      {
        name: 'Phase1 UserA',
        email: userA_email,
        password: 'password123',
        role: 'ONLINE_STUDENT',
        country: 'EG',
        educationLevel: 'SECONDARY',
        gradeLevel: 'SECONDARY_1'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const userA_id = userARes.data.user.id;
    const tokenA = (await loginAs('ONLINE_STUDENT', userA_email, 'password123')).token;

    const userBRes = await axios.post(
      `${USERS}/users`,
      {
        name: 'Phase1 UserB',
        email: userB_email,
        password: 'password123',
        role: 'ONLINE_STUDENT',
        country: 'EG',
        educationLevel: 'SECONDARY',
        gradeLevel: 'SECONDARY_1'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const userB_id = userBRes.data.user.id;
    const tokenB = (await loginAs('ONLINE_STUDENT', userB_email, 'password123')).token;

    // Test 1: Initial unread count is 0
    const initialCountRes = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-01-INITIAL-COUNT',
      initialCountRes.status === 200 && initialCountRes.data.unreadCount === 0,
      `Initial unread count for userA should be 0 (got ${initialCountRes.data.unreadCount})`
    );

    // Test 2: Notification Creation (Self) & Arabic UTF-8 integrity
    const arabicTitle = 'تم إضافة امتحان جديد لمادة الرياضيات';
    const arabicMsg = 'يرجى مراجعة تفاصيل الامتحان والموعد المحدد للبدء';
    const createRes = await axios.post(
      `${NOTIFICATIONS}`,
      {
        title: arabicTitle,
        message: arabicMsg,
        type: 'info',
        metadata: { courseId: 'math-101', priority: 'high' }
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const notifA1 = createRes.data;
    assertTest(
      'NOTIF-02-CREATE-ARABIC',
      createRes.status === 201 && notifA1.title === arabicTitle && notifA1.message === arabicMsg && notifA1.read === false,
      `Notification created successfully with Arabic UTF-8 text preserved`
    );

    // Test 3: Unread count increments
    const afterCreateCount = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-03-UNREAD-COUNT-INCREMENT',
      afterCreateCount.data.unreadCount === 1,
      `Unread count incremented to 1 (got ${afterCreateCount.data.unreadCount})`
    );

    // Test 4: Create second notification for User A
    const notifA2_res = await axios.post(
      `${NOTIFICATIONS}`,
      {
        title: 'تنبيه واجب جديد',
        message: 'تم إضافة واجب الجبر الخطي',
        type: 'warning'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const notifA2 = notifA2_res.data;
    const count2Res = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-04-UNREAD-COUNT-2',
      count2Res.data.unreadCount === 2,
      `Unread count incremented to 2 (got ${count2Res.data.unreadCount})`
    );

    // Test 5: List notifications (Ordering and Isolation)
    const listResA = await axios.get(`${NOTIFICATIONS}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-05-LIST-ISOLATION',
      Array.isArray(listResA.data) &&
      listResA.data.length === 2 &&
      listResA.data[0].id === notifA2.id && // Newest first
      listResA.data[1].id === notifA1.id,
      `List returns 2 notifications ordered newest first`
    );

    // Test 6: RBAC check - Student cannot create notification for another user
    let rbacBlocked = false;
    try {
      await axios.post(
        `${NOTIFICATIONS}`,
        {
          recipientId: userB_id,
          title: 'Unauthorized Notification',
          message: 'Student should not send notifs to others'
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
    } catch (err) {
      if (err.response?.status === 403) {
        rbacBlocked = true;
      }
    }
    assertTest(
      'NOTIF-06-RBAC-BLOCKED',
      rbacBlocked,
      `Student blocked with 403 Forbidden when creating notification for another user`
    );

    // Test 7: Admin CAN create notification for userB
    const adminCreatedNotif = await axios.post(
      `${NOTIFICATIONS}`,
      {
        recipientId: userB_id,
        title: 'رسالة من الإدارة',
        message: 'مرحباً بك في المنصة الذكية',
        type: 'info'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const notifB1 = adminCreatedNotif.data;
    assertTest(
      'NOTIF-07-ADMIN-CREATE-RECIPIENT',
      adminCreatedNotif.status === 201 && notifB1.userId === userB_id,
      `Admin successfully created notification for User B`
    );

    // Test 8: User B list only contains User B's notifications
    const listResB = await axios.get(`${NOTIFICATIONS}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assertTest(
      'NOTIF-08-USER-B-ISOLATION',
      listResB.data.length === 1 && listResB.data[0].id === notifB1.id,
      `User B sees only their own notification (Cross-user isolation verified)`
    );

    // Test 9: IDOR Protection - User A cannot mark User B's notification as read
    let idorBlocked = false;
    try {
      await axios.put(
        `${NOTIFICATIONS}/${notifB1.id}/read`,
        {},
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
    } catch (err) {
      if (err.response?.status === 403) {
        idorBlocked = true;
      }
    }
    assertTest(
      'NOTIF-09-IDOR-MARK-READ-BLOCKED',
      idorBlocked,
      `User A blocked with 403 Forbidden when trying to mark User B's notification as read`
    );

    // Test 10: Mark single notification as read (User A marks notifA1)
    const markReadRes = await axios.put(
      `${NOTIFICATIONS}/${notifA1.id}/read`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assertTest(
      'NOTIF-10-MARK-READ-SINGLE',
      markReadRes.status === 200 && markReadRes.data.notification.read === true && markReadRes.data.notification.readAt != null,
      `User A marked notifA1 as read; readAt timestamp is populated`
    );

    // Test 11: Unread count decrements to 1 after marking 1 notification as read
    const countAfterOneRead = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-11-UNREAD-COUNT-DECREMENT',
      countAfterOneRead.data.unreadCount === 1,
      `Unread count decremented to 1 (got ${countAfterOneRead.data.unreadCount})`
    );

    // Test 12: DB Persistence check for notifA1
    const dbNotifA1 = await db.notification.findUnique({ where: { id: notifA1.id } });
    assertTest(
      'NOTIF-12-DB-PERSISTENCE-SINGLE',
      dbNotifA1 !== null && dbNotifA1.read === true && dbNotifA1.readAt instanceof Date,
      `PostgreSQL database confirms read=true and valid readAt timestamp`
    );

    // Test 13: Mark all as read
    const markAllRes = await axios.put(
      `${NOTIFICATIONS}/read-all`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assertTest(
      'NOTIF-13-MARK-ALL-READ',
      markAllRes.status === 200 && markAllRes.data.count >= 1,
      `User A marked all notifications as read (updated count: ${markAllRes.data.count})`
    );

    // Test 14: Unread count is now 0 for User A
    const countAfterAllRead = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assertTest(
      'NOTIF-14-UNREAD-COUNT-ZERO',
      countAfterAllRead.data.unreadCount === 0,
      `Unread count is 0 after mark-all-as-read`
    );

    // Test 15: Cross-user isolation on mark-all-as-read: User B's notification is still unread!
    const countUserB = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assertTest(
      'NOTIF-15-USER-B-STILL-UNREAD',
      countUserB.data.unreadCount === 1,
      `User B unread count remains 1 (not affected by User A's markAllAsRead)`
    );

    // Test 16: Expiration filtering test
    // Create an expired notification for User B (expires 1 hour ago)
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    await axios.post(
      `${NOTIFICATIONS}`,
      {
        recipientId: userB_id,
        title: 'Expired Notification',
        message: 'This notification should be hidden because it is expired',
        expiresAt: pastDate
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // User B unread count should still be 1 (expired excluded)
    const countUserBAfterExpired = await axios.get(`${NOTIFICATIONS}/unread-count`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assertTest(
      'NOTIF-16-EXPIRED-EXCLUDED-COUNT',
      countUserBAfterExpired.data.unreadCount === 1,
      `Expired notification is excluded from unread count (remains 1)`
    );

    // User B notification list should exclude the expired one
    const listUserBAfterExpired = await axios.get(`${NOTIFICATIONS}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assertTest(
      'NOTIF-17-EXPIRED-EXCLUDED-LIST',
      listUserBAfterExpired.data.length === 1 && listUserBAfterExpired.data[0].id === notifB1.id,
      `Expired notification is excluded from notification list`
    );

    // Test 18: Validation error test (empty title)
    let validationFailed = false;
    try {
      await axios.post(
        `${NOTIFICATIONS}`,
        {
          title: '',
          message: 'Missing title'
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
    } catch (err) {
      if (err.response?.status === 400) {
        validationFailed = true;
      }
    }
    assertTest(
      'NOTIF-18-VALIDATION-REJECTED',
      validationFailed,
      `Empty title rejected with 400 Bad Request`
    );

    console.log('\n=====================================================');
    console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('=====================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test execution:', error.message, error.response?.data);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runTests();
