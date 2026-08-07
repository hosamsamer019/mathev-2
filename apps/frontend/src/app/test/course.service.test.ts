import { courseService } from '../services/course.service';
import { courseApi } from '../services/api';
import { vi } from 'vitest';

vi.mock('../services/api', () => ({
  courseApi: {
    get: vi.fn(),
  },
}));

describe('courseService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getCourses calls correct api endpoint', async () => {
    const mockData = { data: { data: [{ id: '1', title: 'Test Course' }] } };
    (courseApi.get as any).mockResolvedValue(mockData);

    const result = await courseService.getCourses();
    
    expect(courseApi.get).toHaveBeenCalledWith('/', { params: undefined });
    expect(result).toEqual(mockData);
  });
});
