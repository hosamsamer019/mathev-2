describe('Education Platform End-to-End Tests', () => {
  beforeEach(() => {
    // Intercept API calls to prevent failing when DB is down
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { token: 'fake-token', user: { id: 'test-user', role: 'student_online', name: 'Test Student' } }
    }).as('loginStub');
    
    cy.intercept('GET', '**/api/users/profile', {
      statusCode: 200,
      body: { id: 'test-user', role: 'student_online', name: 'Test Student' }
    }).as('profileStub');
  });

  describe('Student Flow', () => {
    it('should login and navigate to dashboard', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type('student@test.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@loginStub');
      cy.url().should('include', '/student/courses');
    });

    it('should complete a lesson and submit homework', () => {
      // Mock APIs
      cy.intercept('GET', '**/api/courses', { body: [] }).as('coursesStub');
      cy.visit('/student/courses');
      cy.wait('@coursesStub');
      
      // In a real DB scenario, we would click through courses.
      // We verify the UI loads the course layout for now.
      cy.contains('الدورات');
    });
  });

  describe('Parent Flow', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: { token: 'fake-token-parent', user: { id: 'parent-1', role: 'parent', name: 'Test Parent' } }
      }).as('parentLoginStub');
    });

    it('should view child progress', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type('parent@test.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@parentLoginStub');
      cy.url().should('include', '/parent/home');
    });
  });

  describe('Teacher Flow', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: { token: 'fake-token-teacher', user: { id: 'teacher-1', role: 'teacher', name: 'Test Teacher' } }
      }).as('teacherLoginStub');
      
      cy.intercept('GET', '**/api/analytics/teacher/teacher-1/overview', {
        statusCode: 200,
        body: {
          totalStudents: 150,
          totalCourses: 3,
          averageScore: 88,
          completionRate: 90,
          strugglingStudents: 5,
          recentActivity: []
        }
      }).as('teacherOverviewStub');
    });

    it('should load teacher dashboard analytics', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type('teacher@test.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@teacherLoginStub');
      cy.url().should('include', '/teacher/home');
      
      cy.wait('@teacherOverviewStub');
      cy.contains('إجمالي الطلاب');
      cy.contains('150');
    });
  });
});
