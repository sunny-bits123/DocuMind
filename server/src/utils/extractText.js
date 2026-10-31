const fs = require('fs/promises');
const pdfParse = require('pdf-parse');

async function extractText(filePath, fileType) {
  if (fileType === 'pdf') {
    const buffer = await fs.readFile(filePath);
    const pages = [];

    // Same line-joining logic pdf-parse uses by default, but we keep each page separate.
    const pagerender = (pageData) =>
      pageData
        .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
        .then((textContent) => {
          let lastY;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += `\n${item.str}`;
            }
            lastY = item.transform[5];
          }
          pages.push({ page: pageData.pageNumber || pageData.pageIndex + 1, text });
          return text;
        });

    await pdfParse(buffer, { pagerender });

    // Drop blank pages so scanned/empty PDFs still hit the "no readable text" check
    return pages.filter((p) => p.text && p.text.trim());
  }

  // txt and md have no pages
  const text = await fs.readFile(filePath, 'utf-8');
  return text.trim() ? [{ page: null, text }] : [];
}

module.exports = extractText;