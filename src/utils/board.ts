export function generateBoardKey(title: string): string {
  const clean = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.slice(0, 8) || 'BOARD';
}

export function resolveBoardImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('file:///')) {
    if (imageUrl.toLowerCase().includes('emerson')) return '/emerson.jpg';
    if (imageUrl.toLowerCase().includes('chatgpt') || imageUrl.toLowerCase().includes('esperia')) return '/esperia.png';
    return null;
  }
  return imageUrl;
}

export function getMemberColor(name: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
