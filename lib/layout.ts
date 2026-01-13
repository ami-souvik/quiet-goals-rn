export function calculateFontSize(
  width: number,
  isMobile: boolean,
  baseScale: number
): number {
  const defaultBase = isMobile ? 0.12 : 0.07;
  return width * defaultBase * baseScale;
}

export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  const avgCharWidth = fontSize * 0.55; // Approximate width factor

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const estimatedWidth = (currentLine.length + 1 + word.length) * avgCharWidth;
      
      if (estimatedWidth < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }
  return lines;
}
