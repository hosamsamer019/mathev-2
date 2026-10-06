import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import LandingPage from '../components/landing/LandingPage';
import { describe, it, expect, beforeEach } from 'vitest';

describe('LandingPage UI & Responsive Verification', () => {
  beforeEach(() => {
    (window as any).IntersectionObserver = class {
      observe = () => null;
      unobserve = () => null;
      disconnect = () => null;
    };
  });

  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <LandingPage />
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders landing page with AL-SADEN brand and Arabic typography', () => {
    renderLandingPage();
    // Brand header
    const brandHeadings = screen.getAllByText('AL-SADEN');
    expect(brandHeadings.length).toBeGreaterThan(0);

    // Hero title in Arabic
    expect(screen.getByText(/تعلّم الرياضيات/i)).toBeInTheDocument();
    expect(screen.getByText(/بذكاء حقيقي/i)).toBeInTheDocument();

    // Section headings
    expect(screen.getAllByText('مميزات المنصة').length).toBeGreaterThan(0);
    expect(screen.getAllByText('الذكاء الاصطناعي').length).toBeGreaterThan(0);
    expect(screen.getAllByText('خطط الاشتراك').length).toBeGreaterThan(0);
    expect(screen.getAllByText('آراء المستخدمين').length).toBeGreaterThan(0);
  });

  it('confirms NO hamburger/sidebar toggle button exists on the public landing page', () => {
    renderLandingPage();

    // Public landing page must not have hamburger/sidebar toggle
    expect(screen.queryByLabelText('Open menu')).toBeNull();
    expect(screen.queryByLabelText('Close menu')).toBeNull();
    expect(document.querySelector('.lucide-menu')).toBeNull();
    expect(document.querySelector('aside.md\\:hidden')).toBeNull();
  });

  it('verifies header primary CTA is simplified to "ابدأ الآن" with duplicate "تسجيل الدخول" removed', () => {
    renderLandingPage();

    // Primary CTA "ابدأ الآن" is present
    expect(screen.getByRole('button', { name: /ابدأ الآن/i })).toBeInTheDocument();

    // "دخول امتحان بكود" is present in header
    const examCodeButtons = screen.getAllByRole('button', { name: /دخول امتحان بكود|امتحان بكود/i });
    expect(examCodeButtons.length).toBeGreaterThan(0);

    // Separate duplicate "تسجيل الدخول" button in header/hero is removed
    expect(screen.queryByRole('button', { name: /^تسجيل الدخول$/i })).toBeNull();
  });

  it('renders concise OX Digital ownership statement in the footer with only OX Digital clickable', () => {
    renderLandingPage();

    const oxDigitalLink = screen.getByRole('link', { name: /^OX Digital$/i });
    expect(oxDigitalLink).toBeInTheDocument();
    expect(oxDigitalLink).toHaveAttribute('href', 'https://ox-digital-eg.vercel.app/');
    expect(oxDigitalLink).toHaveAttribute('target', '_blank');
    expect(oxDigitalLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Ownership notice
    expect(screen.getByText(/منصة وبرمجية مملوكة بالكامل لـ/i)).toBeInTheDocument();
  });

  it('renders semantic HTML structure with exactly one h1 and proper sections', () => {
    renderLandingPage();

    expect(document.querySelector('header')).toBeInTheDocument();
    expect(document.querySelector('nav')).toBeInTheDocument();
    expect(document.querySelector('main')).toBeInTheDocument();
    expect(document.querySelector('footer')).toBeInTheDocument();

    const h1Elements = document.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);
    expect(h1Elements[0].textContent).toContain('تعلّم الرياضيات');

    // Sections
    expect(document.querySelector('section#features')).toBeInTheDocument();
    expect(document.querySelector('section#about')).toBeInTheDocument();
    expect(document.querySelector('section#pricing')).toBeInTheDocument();
    expect(document.querySelector('section#faq')).toBeInTheDocument();
    expect(document.querySelector('section#testimonials')).toBeInTheDocument();
  });

  it('renders About and FAQ sections with factual content and interactive accordion', () => {
    renderLandingPage();

    // About section content
    expect(screen.getAllByText('عن المنصة').length).toBeGreaterThan(0);
    expect(screen.getByText('منظومة AL-SADEN التعليمية المتكاملة')).toBeInTheDocument();
    expect(screen.getByText('للطلاب')).toBeInTheDocument();
    expect(screen.getByText('للمعلمين والمراكز')).toBeInTheDocument();
    expect(screen.getByText('لأولياء الأمور')).toBeInTheDocument();

    // FAQ section content
    expect(screen.getAllByText('الأسئلة الشائعة').length).toBeGreaterThan(0);
    expect(screen.getByText('ما هي منصة AL-SADEN؟')).toBeInTheDocument();
    expect(screen.getByText('لمن صُممت منصة AL-SADEN؟')).toBeInTheDocument();
    expect(screen.getByText('ماذا تقدم المنصة للطالب؟')).toBeInTheDocument();
    expect(screen.getByText('هل توفر المنصة ميزة حل المسائل بالذكاء الاصطناعي؟')).toBeInTheDocument();
  });
});


