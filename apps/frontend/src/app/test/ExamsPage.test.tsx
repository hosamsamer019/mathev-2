import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExamsPage from '../components/student-shared/ExamsPage';
import { examService } from '../services/exam.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock examService
vi.mock('../services/exam.service', () => ({
  examService: {
    getExams: vi.fn(),
    getExamDetails: vi.fn(),
    startAttempt: vi.fn(),
    syncAttempt: vi.fn().mockResolvedValue({ data: { success: true } }),
    submitAttempt: vi.fn(),
  },
}));

// Mock useExamAntiCheat hook
vi.mock('../hooks/useExamAntiCheat', () => ({
  useExamAntiCheat: () => ({
    violationCount: 0,
    showMultiTabWarning: false,
  }),
}));

const mockExamData = {
  id: 'exam-123',
  title: 'امتحان الجبر والتفاضل',
  duration: 45,
  requiresCamera: false,
  questions: [
    {
      id: 'q1',
      text: 'ما هو ناتج 5 + 7؟',
      type: 'MCQ',
      options: ['10', '11', '12', '13'],
      points: 5,
    },
    {
      id: 'q2',
      text: 'ما هي عاصمة مصر؟',
      type: 'MCQ',
      options: ['الإسكندرية', 'القاهرة', 'الجيزة', 'أسوان'],
      points: 5,
    },
    {
      id: 'q3',
      text: 'حل المعادلة 2x = 10',
      type: 'MCQ',
      options: ['3', '4', '5', '6'],
      points: 5,
    },
  ],
};

describe('ExamsPage — One Question at a Time DOM Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('edu-user', JSON.stringify({ id: 'student-1', role: 'ONLINE_STUDENT' }));

    (examService.getExams as any).mockResolvedValue({
      data: [{ id: 'exam-123', title: 'امتحان الجبر والتفاضل', duration: 45, status: 'active', questions: mockExamData.questions }],
    });

    (examService.getExamDetails as any).mockResolvedValue({
      data: mockExamData,
    });

    (examService.startAttempt as any).mockResolvedValue({
      data: {
        attempt: {
          id: 'attempt-999',
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          answers: [],
        },
      },
    });

    (examService.submitAttempt as any).mockResolvedValue({
      data: {
        id: 'attempt-999',
        status: 'GRADED',
        score: 100,
        percentage: 100,
      },
    });
  });

  const setupAndStartExam = async () => {
    let result: any;
    await act(async () => {
      result = render(
        <MemoryRouter>
          <ExamsPage />
        </MemoryRouter>
      );
    });

    // 1. Click Start Exam from list
    const startBtn = await screen.findByText('ابدأ الامتحان');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    // 2. Click Start Exam from setup
    const beginBtn = await screen.findByRole('button', { name: 'ابدأ الامتحان' });
    await act(async () => {
      fireEvent.click(beginBtn);
    });

    return result;
  };

  it('proves only Question 1 is mounted in DOM initially; Questions 2 and 3 are NOT in DOM', async () => {
    const { container } = await setupAndStartExam();

    // Question 1 text is mounted
    expect(screen.getByText(/ما هو ناتج 5 \+ 7؟/)).toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q1"]')).toBeInTheDocument();

    // Questions 2 and 3 are completely absent from the DOM (not hidden, not mounted)
    expect(screen.queryByText(/ما هي مشتقة دالة x\^2؟/)).not.toBeInTheDocument();
    expect(screen.queryByText(/حل المعادلة 2x = 10/)).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q2"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q3"]')).not.toBeInTheDocument();

    // Verify only ONE question container exists in the entire DOM
    const questionContainers = container.querySelectorAll('[data-testid^="question-container-"]');
    expect(questionContainers.length).toBe(1);
  });

  it('proves navigating to Question 2 unmounts Question 1 and mounts only Question 2', async () => {
    const { container } = await setupAndStartExam();

    // Select answer for Question 1 (option '12', index 2)
    const option12 = screen.getByLabelText(/12/);
    await act(async () => {
      fireEvent.click(option12);
    });

    // Click Next button
    const nextBtn = screen.getByRole('button', { name: /التالي/ });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Question 1 must now be UNMOUNTED
    expect(screen.queryByText(/ما هو ناتج 5 \+ 7؟/)).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q1"]')).not.toBeInTheDocument();

    // Question 2 is MOUNTED
    expect(screen.getByText(/ما هي عاصمة مصر؟/)).toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q2"]')).toBeInTheDocument();

    // Question 3 remains unmounted
    expect(screen.queryByText(/حل المعادلة 2x = 10/)).not.toBeInTheDocument();

    // Verify still exactly 1 question container in DOM
    const questionContainers = container.querySelectorAll('[data-testid^="question-container-"]');
    expect(questionContainers.length).toBe(1);
  });

  it('preserves answers across questions and restores selected state when returning to a previous question', async () => {
    const { container } = await setupAndStartExam();

    // 1. Answer Q1 with '12' (index 2)
    const option12 = screen.getByLabelText(/12/);
    await act(async () => {
      fireEvent.click(option12);
    });

    // 2. Move to Q2
    const nextBtn = screen.getByRole('button', { name: /التالي/ });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // 3. Answer Q2 with 'القاهرة' (index 1)
    const optionCairo = screen.getByLabelText(/القاهرة/);
    await act(async () => {
      fireEvent.click(optionCairo);
    });

    // 4. Return to Q1 via Previous button
    const prevBtn = screen.getByRole('button', { name: /السابق/ });
    await act(async () => {
      fireEvent.click(prevBtn);
    });

    // Q1 is mounted again
    expect(screen.getByText(/ما هو ناتج 5 \+ 7؟/)).toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="question-container-q2"]')).not.toBeInTheDocument();

    // Selected answer for Q1 ('12') is preserved and checked
    const reloadedOption12 = screen.getByLabelText(/12/) as HTMLInputElement;
    expect(reloadedOption12.checked).toBe(true);

    // 5. Jump directly to Q2 via question jumper
    const q2JumperBtn = screen.getByRole('button', { name: '2' });
    await act(async () => {
      fireEvent.click(q2JumperBtn);
    });

    // Q2 is mounted and its answer 'القاهرة' is preserved
    expect(screen.getByText(/ما هي عاصمة مصر؟/)).toBeInTheDocument();
    const reloadedOptionCairo = screen.getByLabelText(/القاهرة/) as HTMLInputElement;
    expect(reloadedOptionCairo.checked).toBe(true);
  });

  it('submits all preserved answers on final submit', async () => {
    await setupAndStartExam();

    // Answer Q1
    const option12 = screen.getByLabelText(/12/);
    await act(async () => {
      fireEvent.click(option12);
    });

    // Move to Q2 and answer
    const nextBtn = screen.getByRole('button', { name: /التالي/ });
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    const optionCairo = screen.getByLabelText(/القاهرة/);
    await act(async () => {
      fireEvent.click(optionCairo);
    });

    // Mock confirm dialog
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /إنهاء وتسليم/ });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Verify submitAttempt was called with all accumulated answers
    expect(examService.submitAttempt).toHaveBeenCalledWith(
      'exam-123',
      expect.arrayContaining([
        { questionId: 'q1', answer: '2' },
        { questionId: 'q2', answer: '1' },
      ])
    );
  });
});
