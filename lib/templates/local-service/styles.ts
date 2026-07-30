// Services-grid, contact-forward layout — the default fallback template (see
// lib/templates/registry.ts::pickDefaultTemplate) since most prospects Kondo targets are
// exactly this shape: a business with a handful of services and a phone number that
// matters more than a hero photo. Degrades to a gradient hero built from brandColors when
// heroImageUrl is null (see index.tsx).
export const css = `
  .tpl-local {
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1f2937;
    background: #ffffff;
  }
  .tpl-local a { color: inherit; }

  .tpl-local-topbar {
    background: var(--c-primary, #1f2937);
    color: #ffffff;
    text-align: center;
    font-size: 13px;
    padding: 8px 16px;
  }
  .tpl-local-topbar a { color: #ffffff; font-weight: 700; text-decoration: none; }

  .tpl-local-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1120px;
    margin: 0 auto;
    padding: 20px 24px;
  }
  .tpl-local-nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; }
  .tpl-local-nav-logo { height: 36px; width: auto; }
  .tpl-local-nav-phone {
    font-weight: 800;
    font-size: 18px;
    text-decoration: none;
    color: var(--c-primary, #1f2937);
  }

  .tpl-local-hero {
    position: relative;
    padding: 64px 24px 88px;
    text-align: center;
    color: #ffffff;
    background: var(--c-primary, #1f2937);
    background-size: cover;
    background-position: center;
  }
  .tpl-local-hero-overlay { position: absolute; inset: 0; background: rgba(17,24,39,0.6); }
  .tpl-local-hero-inner { position: relative; max-width: 700px; margin: 0 auto; }
  .tpl-local-hero-tagline { font-size: clamp(26px, 5vw, 44px); font-weight: 800; margin: 0 0 18px; letter-spacing: -0.02em; }
  .tpl-local-hero-about { font-size: 17px; opacity: 0.92; margin: 0 auto 28px; max-width: 540px; }
  .tpl-local-hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .tpl-local-hero-cta-primary,
  .tpl-local-hero-cta-secondary {
    display: inline-block;
    padding: 14px 28px;
    border-radius: 10px;
    font-weight: 700;
    text-decoration: none;
    font-size: 15px;
  }
  .tpl-local-hero-cta-primary { background: var(--c-accent, #3b82f6); color: #ffffff; }
  .tpl-local-hero-cta-secondary { background: rgba(255,255,255,0.14); color: #ffffff; border: 1px solid rgba(255,255,255,0.5); }

  .tpl-local-section { max-width: 1120px; margin: 0 auto; padding: 64px 24px; }
  .tpl-local-section-title { font-size: clamp(22px, 4vw, 30px); font-weight: 800; text-align: center; margin: 0 0 36px; color: #111827; }

  .tpl-local-services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .tpl-local-service-card {
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #eef0f3;
    border-top: 3px solid var(--c-secondary, #6b7280);
  }
  .tpl-local-service-name { font-weight: 700; font-size: 16px; margin: 0 0 8px; color: #111827; }
  .tpl-local-service-desc { margin: 0; color: #4b5563; font-size: 14px; }

  .tpl-local-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .tpl-local-gallery img { border-radius: 10px; aspect-ratio: 4 / 3; object-fit: cover; width: 100%; }

  .tpl-local-testimonials { display: flex; flex-direction: column; gap: 18px; max-width: 760px; margin: 0 auto; }
  .tpl-local-testimonial {
    padding: 24px;
    border-radius: 12px;
    background: #f9fafb;
    border-left: 4px solid var(--c-accent, #3b82f6);
  }
  .tpl-local-testimonial-quote { font-size: 16px; color: #1f2937; margin: 0 0 12px; }
  .tpl-local-testimonial-quote::before { content: "\\201C"; }
  .tpl-local-testimonial-quote::after { content: "\\201D"; }
  .tpl-local-testimonial-author { font-weight: 700; font-size: 14px; color: #111827; }
  .tpl-local-testimonial-role { font-size: 13px; color: #6b7280; }

  .tpl-local-contact {
    background: var(--c-primary, #1f2937);
    color: #ffffff;
    text-align: center;
    padding: 56px 24px;
  }
  .tpl-local-contact-title { font-size: 26px; font-weight: 800; margin: 0 0 20px; }
  .tpl-local-contact-details { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; font-size: 16px; }
  .tpl-local-contact-details a { text-decoration: underline; }

  @media (max-width: 720px) {
    .tpl-local-services { grid-template-columns: 1fr; }
    .tpl-local-gallery { grid-template-columns: repeat(2, 1fr); }
    .tpl-local-hero { padding: 48px 20px 64px; }
    .tpl-local-section { padding: 40px 20px; }
    .tpl-local-nav-phone { font-size: 16px; }
  }
`;
