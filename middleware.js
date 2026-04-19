/**
 * Vercel Edge Middleware — Markdown for Agents
 * 
 * When a request includes Accept: text/markdown, this middleware
 * fetches the HTML response and converts it to clean markdown.
 * HTML remains the default for browsers and other clients.
 * 
 * Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 */

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/pages/:path*.html',
  ],
};

/**
 * Lightweight HTML-to-Markdown converter for edge runtime.
 * Handles headings, paragraphs, links, bold, italic, lists, tables, and code blocks.
 */
function htmlToMarkdown(html) {
  // Remove script, style, nav, header, footer, and noscript blocks
  let md = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Extract title from <title> or <h1>
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `\n# ${stripTags(c).trim()}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `\n## ${stripTags(c).trim()}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `\n### ${stripTags(c).trim()}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `\n#### ${stripTags(c).trim()}\n`);

  // Links: <a href="...">text</a> -> [text](url)
  md = md.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${stripTags(text).trim()}](${href})`);

  // Bold and italic
  md = md.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, __, c) => `**${stripTags(c).trim()}**`);
  md = md.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_, __, c) => `*${stripTags(c).trim()}*`);

  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => `\n\`\`\`\n${decodeEntities(c).trim()}\n\`\`\`\n`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${stripTags(c).trim()}\``);

  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
    const rows = [];
    const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      const cells = [];
      const cellMatches = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      for (const cell of cellMatches) {
        const content = cell.replace(/<\/?(?:td|th)[^>]*>/gi, '');
        cells.push(stripTags(content).trim());
      }
      rows.push(cells);
    }
    if (rows.length === 0) return '';
    const colCount = Math.max(...rows.map(r => r.length));
    let table = '\n';
    rows.forEach((row, i) => {
      const padded = Array.from({ length: colCount }, (_, j) => row[j] || '');
      table += '| ' + padded.join(' | ') + ' |\n';
      if (i === 0) {
        table += '| ' + padded.map(() => '---').join(' | ') + ' |\n';
      }
    });
    return table + '\n';
  });

  // List items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${stripTags(c).trim()}\n`);
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, c) => '\n' + stripTags(c).trim().split('\n').map(l => `> ${l.trim()}`).join('\n') + '\n');

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => {
    const text = stripTags(c).trim();
    return text ? `\n${text}\n` : '';
  });

  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Strip all remaining HTML tags
  md = stripTags(md);

  // Decode HTML entities
  md = decodeEntities(md);

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  // Prepend title and description as frontmatter-like header
  let header = '';
  if (title) header += `# ${title}\n\n`;
  if (description) header += `> ${description}\n\n`;
  if (header && !md.startsWith('# ')) {
    md = header + md;
  }

  return md;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

export default async function middleware(request) {
  const accept = request.headers.get('accept') || '';

  // Only intercept if the client explicitly wants markdown
  if (!accept.includes('text/markdown')) {
    return;  // Let Vercel serve HTML normally
  }

  // Fetch the original HTML response
  const url = new URL(request.url);
  const response = await fetch(url.toString(), {
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'accept': 'text/html',  // Override to get HTML from origin
    },
  });

  // Only convert successful HTML responses
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html);

  // Estimate token count (~4 chars per token)
  const tokenEstimate = Math.ceil(markdown.length / 4);

  return new Response(markdown, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'x-markdown-tokens': tokenEstimate.toString(),
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  });
}
