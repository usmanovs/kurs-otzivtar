import React from 'react';

/**
 * Renders schema.org JSON-LD inline. Review text is user-authored, so `<` is
 * escaped — otherwise a review containing "</script>" would close the tag and
 * inject markup.
 */
export const JsonLd: React.FC<{ data: unknown }> = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
  />
);
