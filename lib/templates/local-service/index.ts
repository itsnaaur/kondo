import { escapeHtml } from "../escape-html";
import type { TemplateContent } from "../types";

function colorFor(content: TemplateContent, role: "primary" | "secondary" | "accent"): string | undefined {
  return content.brandColors.find((c) => c.role === role)?.hex;
}

export default function renderLocalServiceTemplate(content: TemplateContent): string {
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

  const businessName = escapeHtml(content.businessName);
  const phone = content.contactPhone ? escapeHtml(content.contactPhone) : null;

  const navBrand = content.logoUrl
    ? `<img class="tpl-local-nav-logo" src="${escapeHtml(content.logoUrl)}" alt="${businessName}" />`
    : `<span>${businessName}</span>`;

  const servicesSection = content.services.length
    ? `<section class="tpl-local-section">
        <h2 class="tpl-local-section-title">Our services</h2>
        <div class="tpl-local-services">
          ${content.services
            .map(
              (s) => `<div class="tpl-local-service-card">
                <h3 class="tpl-local-service-name">${escapeHtml(s.name)}</h3>
                <p class="tpl-local-service-desc">${escapeHtml(s.description)}</p>
              </div>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  const gallerySection = content.galleryImages.length
    ? `<section class="tpl-local-section">
        <h2 class="tpl-local-section-title">Our work</h2>
        <div class="tpl-local-gallery">
          ${content.galleryImages
            .map((img) => `<img src="${escapeHtml(img.url)}" alt="${businessName}" />`)
            .join("")}
        </div>
      </section>`
    : "";

  const testimonialsSection = content.testimonials.length
    ? `<section class="tpl-local-section">
        <h2 class="tpl-local-section-title">What our customers say</h2>
        <div class="tpl-local-testimonials">
          ${content.testimonials
            .map(
              (t) => `<div class="tpl-local-testimonial">
                <p class="tpl-local-testimonial-quote">${escapeHtml(t.quote)}</p>
                <div class="tpl-local-testimonial-author">${escapeHtml(t.author)}</div>
                ${t.role ? `<div class="tpl-local-testimonial-role">${escapeHtml(t.role)}</div>` : ""}
              </div>`
            )
            .join("")}
        </div>
      </section>`
    : "";

  return `<div class="tpl-local" style="${rootStyle}">
    ${phone ? `<div class="tpl-local-topbar">Call now: <a href="tel:${phone}">${phone}</a></div>` : ""}

    <nav class="tpl-local-nav">
      <div class="tpl-local-nav-brand">${navBrand}</div>
      ${phone ? `<a class="tpl-local-nav-phone" href="tel:${phone}">${phone}</a>` : ""}
    </nav>

    <header class="tpl-local-hero" style="${heroStyle}">
      <div class="tpl-local-hero-overlay"></div>
      <div class="tpl-local-hero-inner">
        <h1 class="tpl-local-hero-tagline">${escapeHtml(content.tagline || content.businessName)}</h1>
        ${content.aboutCopy ? `<p class="tpl-local-hero-about">${escapeHtml(content.aboutCopy)}</p>` : ""}
        <div class="tpl-local-hero-ctas">
          ${phone ? `<a class="tpl-local-hero-cta-primary" href="tel:${phone}">Call now</a>` : ""}
          ${content.contactEmail ? `<a class="tpl-local-hero-cta-secondary" href="mailto:${escapeHtml(content.contactEmail)}">Get a quote</a>` : ""}
        </div>
      </div>
    </header>

    ${servicesSection}
    ${gallerySection}
    ${testimonialsSection}

    <section class="tpl-local-contact">
      <h2 class="tpl-local-contact-title">Get in touch</h2>
      <div class="tpl-local-contact-details">
        ${phone ? `<a href="tel:${phone}">${phone}</a>` : ""}
        ${content.contactEmail ? `<a href="mailto:${escapeHtml(content.contactEmail)}">${escapeHtml(content.contactEmail)}</a>` : ""}
        ${content.contactAddress ? `<span>${escapeHtml(content.contactAddress)}</span>` : ""}
      </div>
    </section>
  </div>`;
}
