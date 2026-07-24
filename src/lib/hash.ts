import crypto from 'crypto';

export function generateInternshipHash(title: string, company: string, date: Date | string | null): string {
  // Hash format = sha256(title + company + roughDate)
  // We'll use YYYY-MM for rough date so minor posting time differences don't create dupes.
  let roughDate = '';
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      roughDate = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  }

  const normalizedTitle = title.toLowerCase().trim();
  const normalizedCompany = company.toLowerCase().trim();
  const rawString = `${normalizedTitle}-${normalizedCompany}-${roughDate}`;

  return crypto.createHash('sha256').update(rawString).digest('hex');
}
