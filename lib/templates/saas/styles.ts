// Hero-heavy, image-forward layout — degrades to a gradient hero built from brandColors
// when heroImageUrl is null (see index.tsx), styled to read as a deliberate choice rather
// than a missing image. Custom properties (--c-primary/--c-secondary/--c-accent) are set
// inline per-render from the client's actual brand colors; every rule below references
// them rather than hardcoding a palette.
export const css = `
  .tpl-saas {
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1f2937;
    background: #ffffff;
  }
  .tpl-saas a { color: inherit; }

  .tpl-saas-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1120px;
    margin: 0 auto;
    padding: 20px 24px;
  }
  .tpl-saas-nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
  .tpl-saas-nav-logo { height: 32px; width: auto; }
  .tpl-saas-nav-cta {
    display: inline-block;
    padding: 10px 20px;
    border-radius: 8px;
    background: var(--c-primary, #1f2937);
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    text-decoration: none;
  }

  .tpl-saas-hero {
    position: relative;
    padding: 72px 24px 96px;
    text-align: center;
    color: #ffffff;
    background: var(--c-primary, #1f2937);
    background-size: cover;
    background-position: center;
  }
  .tpl-saas-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(17,24,39,0.55) 0%, rgba(17,24,39,0.75) 100%);
  }
  .tpl-saas-hero-inner { position: relative; max-width: 760px; margin: 0 auto; }
  .tpl-saas-hero-tagline { font-size: clamp(28px, 5vw, 48px); font-weight: 800; margin: 0 0 20px; letter-spacing: -0.02em; }
  .tpl-saas-hero-about { font-size: 18px; opacity: 0.92; margin: 0 auto 32px; max-width: 560px; }
  .tpl-saas-hero-cta {
    display: inline-block;
    padding: 14px 32px;
    border-radius: 10px;
    background: var(--c-accent, #3b82f6);
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
    font-size: 16px;
  }

  .tpl-saas-section { max-width: 1120px; margin: 0 auto; padding: 72px 24px; }
  .tpl-saas-section-title {
    font-size: clamp(24px, 4vw, 32px);
    font-weight: 800;
    text-align: center;
    margin: 0 0 40px;
    color: #111827;
  }

  .tpl-saas-services {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .tpl-saas-service-card {
    padding: 28px;
    border-radius: 14px;
    background: #f9fafb;
    border: 1px solid #eef0f3;
  }
  .tpl-saas-service-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: var(--c-secondary, #6b7280);
    margin-bottom: 16px;
  }
  .tpl-saas-service-name { font-weight: 700; font-size: 17px; margin: 0 0 8px; color: #111827; }
  .tpl-saas-service-desc { margin: 0; color: #4b5563; font-size: 15px; }

  .tpl-saas-testimonials { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .tpl-saas-testimonial {
    padding: 28px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid #eef0f3;
  }
  .tpl-saas-testimonial-quote { font-size: 16px; color: #1f2937; margin: 0 0 16px; }
  .tpl-saas-testimonial-quote::before { content: "\\201C"; }
  .tpl-saas-testimonial-quote::after { content: "\\201D"; }
  .tpl-saas-testimonial-author { font-weight: 700; font-size: 14px; color: #111827; }
  .tpl-saas-testimonial-role { font-size: 13px; color: #6b7280; }

  .tpl-saas-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .tpl-saas-gallery img { border-radius: 12px; aspect-ratio: 4 / 3; object-fit: cover; width: 100%; }

  .tpl-saas-contact {
    background: #f9fafb;
    text-align: center;
    padding: 64px 24px;
  }
  .tpl-saas-contact-title { font-size: 26px; font-weight: 800; margin: 0 0 12px; color: #111827; }
  .tpl-saas-contact-details { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; font-size: 15px; color: #374151; }

  @media (max-width: 720px) {
    .tpl-saas-services { grid-template-columns: 1fr; }
    .tpl-saas-testimonials { grid-template-columns: 1fr; }
    .tpl-saas-gallery { grid-template-columns: repeat(2, 1fr); }
    .tpl-saas-hero { padding: 56px 20px 72px; }
    .tpl-saas-section { padding: 48px 20px; }
  }
`;
