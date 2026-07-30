import { escapeHtml } from "../escape-html";
import type { TemplateContent } from "../types";

function colorFor(content: TemplateContent, role: "primary" | "secondary" | "accent"): string | undefined {
  return content.brandColors.find((c) => c.role === role)?.hex;
}

const CONTACT_HREF = (content: TemplateContent): string | null =>
  content.contactEmail
    ? `mailto:${escapeHtml(content.contactEmail)}`
    : content.contactPhone
      ? `tel:${escapeHtml(content.contactPhone)}`
      : null;

export default function renderSaasTemplate(content: TemplateContent): string {
  const primary = colorFor(content, "primary") ?? "#1f2937";
  const secondary = colorFor(content, "secondary") ?? "#6b7280";
  const accent = colorFor(content, "accent") ?? "#3b82f6";

  const rootStyle = `--c-primary:${escapeHtml(primary)};--c-secondary:${escapeHtml(secondary)};--c-accent:${escapeHtml(accent)};`;

  // heroImageUrl is null whenever no unflagged photo qualifies — a prospect with no
  // usable photography is the normal case this tool exists for. The gradient built from
  // the client's own brand colors reads as a deliberate design choice, not a missing image.
  const heroStyle = content.heroImageUrl
    ? `background-image:url('${escapeHtml(content.heroImageUrl)}');`
    : `background-image:linear-gradient(135deg, ${escapeHtml(primary)} 0%, ${escapeHtml(secondary)} 100%);`;

  const contactHref = CONTACT_HREF(content);
  const businessName = escapeHtml(content.businessName);

  const navBrand = content.logoUrl
    ? `<img class="tpl-saas-nav-logo" src="${escapeHtml(content.logoUrl)}" alt="${businessName}" />`
    : `<span>${businessName}</span>`;

  const servicesSection = content.services.length
    ? `<section class="tpl-saas-section">
        <h2 class="tpl-saas-section-title">What we offer</h2>
        <div class="tpl-saas-services">
          ${content.services
            .map(
              (s) => `<div class="tpl-saas-service-card">
                <div class="tpl-saas-service-icon"></div>
                <h3 class="tpl-saas-service-name">${escapeHtml(s.name)}</h3>
                <p class="tpl-saas-service-desc">${escapeHtml(s.description)}</p>
              </div>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  const gallerySection = content.galleryImages.length
    ? `<section class="tpl-saas-section">
        <h2 class="tpl-saas-section-title">A closer look</h2>
        <div class="tpl-saas-gallery">
          ${content.galleryImages
            .map((img) => `<img src="${escapeHtml(img.url)}" alt="${businessName}" />`)
            .join("")}
        </div>
      </section>`
    : "";

  const testimonialsSection = content.testimonials.length
    ? `<section class="tpl-saas-section">
        <h2 class="tpl-saas-section-title">What people say</h2>
        <div class="tpl-saas-testimonials">
          ${content.testimonials
            .map(
              (t) => `<div class="tpl-saas-testimonial">
                <p class="tpl-saas-testimonial-quote">${escapeHtml(t.quote)}</p>
                <div class="tpl-saas-testimonial-author">${escapeHtml(t.author)}</div>
                ${t.role ? `<div class="tpl-saas-testimonial-role">${escapeHtml(t.role)}</div>` : ""}
              </div>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  return `<div class="tpl-saas" style="${rootStyle}">
    <nav class="tpl-saas-nav">
      <div class="tpl-saas-nav-brand">${navBrand}</div>
      ${contactHref ? `<a class="tpl-saas-nav-cta" href="${contactHref}">Get in touch</a>` : ""}
    </nav>

    <header class="tpl-saas-hero" style="${heroStyle}">
      <div class="tpl-saas-hero-overlay"></div>
      <div class="tpl-saas-hero-inner">
        <h1 class="tpl-saas-hero-tagline">${escapeHtml(content.tagline || content.businessName)}</h1>
        ${content.aboutCopy ? `<p class="tpl-saas-hero-about">${escapeHtml(content.aboutCopy)}</p>` : ""}
        ${contactHref ? `<a class="tpl-saas-hero-cta" href="${contactHref}">Get started</a>` : ""}
      </div>
    </header>

    ${servicesSection}
    ${gallerySection}
    ${testimonialsSection}

    <section class="tpl-saas-contact">
      <h2 class="tpl-saas-contact-title">Let's talk</h2>
      <div class="tpl-saas-contact-details">
        ${content.contactEmail ? `<a href="mailto:${escapeHtml(content.contactEmail)}">${escapeHtml(content.contactEmail)}</a>` : ""}
        ${content.contactPhone ? `<a href="tel:${escapeHtml(content.contactPhone)}">${escapeHtml(content.contactPhone)}</a>` : ""}
        ${content.contactAddress ? `<span>${escapeHtml(content.contactAddress)}</span>` : ""}
      </div>
    </section>
  </div>`;
}
