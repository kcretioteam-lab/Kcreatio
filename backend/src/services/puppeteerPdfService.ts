import puppeteer, { Browser } from 'puppeteer-core';
import { format } from 'date-fns';

const STATE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWordsBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tensWords[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWordsBelowThousand(n % 100) : '');
}

function amountInWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'INR Zero Only';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;
  let words = '';
  if (crore) words += numToWordsBelowThousand(crore) + ' Crore ';
  if (lakh) words += numToWordsBelowThousand(lakh) + ' Lakh ';
  if (thousand) words += numToWordsBelowThousand(thousand) + ' Thousand ';
  if (remainder) words += numToWordsBelowThousand(remainder);
  return 'INR ' + words.trim() + ' Only';
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d.includes('T') ? d : d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
}

function inr(n: number | null | undefined): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface InvoiceForPdf {
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  purchase_order_number?: string | null;
  discount_value?: number | null;
  discount_type?: string | null;
  reverse_charge?: string | null;
  brand_name: string;
  brand_gstin?: string | null;
  brand_address?: string | null;
  brand_state_code?: string | null;
  brand_pan?: string | null;
  brand_email?: string | null;
  brand_phone?: string | null;
  service_description: string;
  sac_code?: string | null;
  base_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  supply_type: string;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  place_of_supply?: string | null;
  notes?: string | null;
  include_bank_details?: boolean;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
  upi_id?: string | null;
  include_upi?: boolean;
  upi_scanner_url?: string | null;
  include_terms?: boolean;
  terms_text?: string | null;
  include_signatory?: boolean;
  signatory_name?: string | null;
  signatory_image_url?: string | null;
  seller_business_name?: string | null;
  template_id?: string | null;
  invoice_accent_color?: string | null;
}

export interface UserForPdf {
  name: string;
  email?: string | null;
  business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  business_address?: string | null;
  state_code?: string | null;
  phone?: string | null;
  show_phone_on_invoice?: boolean | null;
  invoice_phone?: string | null;
  invoice_email?: string | null;
}

const LOGO_B64 = 'PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJ5ZXMiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjMxMy45MTUwMDAwMDAwMDAxIDIxOC41ODEgNDI5LjM0OCA0MjkuMzQ4Ij4KPHBhdGggc3R5bGU9ImZpbGw6IzU0NWM2Nzsgc3Ryb2tlOm5vbmU7IiBkPSJNNjI5IDI5NkM2MzUuNjc4IDI5OC44MDIgNjQ1Ljc4NCAyOTcgNjUzIDI5N0w3MDYgMjk3QzY5OS4zMjIgMjk0LjE5OCA2ODkuMjE2IDI5NiA2ODIgMjk2TDYyOSAyOTZ6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiMyOTQxZGI7IHN0cm9rZTpub25lOyIgZD0iTTQ3OSAyOTdDNDgwLjc2OSAyOTcuNzc5IDQ4Mi4wMzYgMjk3LjkxMiA0ODQgMjk4TDQ3MSAzMDNMNDczIDMwNkw0NjUgMzA3QzQ2MC4wODIgMzE4LjA3NSA0NjEgMzI5LjA5OSA0NjEgMzQxQzQ2MSAzNTYuMzA4IDQ2MC40OTggMzcxLjcwNCA0NjAuODU5IDM4N0M0NjEuMDA4IDM5My4zMzEgNDY0LjI0NiAzOTcuMjY3IDQ2MyA0MDRDNDY1Ljk2NyA0MDQgNDY1LjY3NCA0MDYuMzY0IDQ2Ni4zMzMgNDA5QzQ2Ny43NzggNDE0Ljc3NyA0NzAuOTgzIDQxOS41MjUgNDczIDQyNUM0NzguOTE1IDQyMi40MzQgNDc5LjQ3OCA0MTcuNjYzIDQ4My41MjkgNDEzLjI3NEM0ODcuNjI2IDQwOC44MzQgNDkyLjkzMyA0MDUuMjkgNDk3LjIxNSA0MDAuOTZDNTAyLjY4MyAzOTUuNDMxIDUwNy41NzkgMzg5LjE1NyA1MTQuMDE1IDM4NC41NDJDNTIwLjE3NCAzODAuMTI0IDUzMS4xMjggMzgxLjA1IDUzNC44NTYgMzc0LjE2NEM1MzYuNzI3IDM3MC43MSA1MzYgMzY1Ljc3OSA1MzYgMzYyQzUzNi4wMDEgMzUzLjM1NiA1MzUuNjYxIDM0NC42MzUgNTM2LjAzOSAzMzZDNTM2LjM3NyAzMjguMjk2IDUzNy4wMzcgMzIwLjc1NCA1MzYuOTk5IDMxM0M1MzYuOTc2IDMwOC4xNzEgNTM2LjY5OCAzMDIuODY4IDUzMi43NzUgMjk5LjQzNEM1MjguNjkgMjk1Ljg1NiA1MjIuMDE5IDI5NyA1MTcgMjk3TDQ3OSAyOTd6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiM0OGFlZmQ7IHN0cm9rZTpub25lOyIgZD0iTTQ5MyA0MThDNDk2Ljg3OCA0MTYuNjQzIDUwMC45MDMgNDE2LjE3NCA1MDUgNDE2QzUwMi4yMzcgNDIxLjQ0NSA1MTAuNTE4IDQyNC45MTYgNTEzLjAwMiA0MjkuMjg1QzUxNS44MjggNDM0LjI1OCA1MTMuMTE2IDQ0MC4wMSA1MTUuMDYzIDQ0NC42NTVDNTE2LjkyIDQ0OS4wODQgNTMwLjI5MSA0NDcuMDMxIDUzNCA0NDUuNjMzQzU0NC4yMDEgNDQxLjc5IDU1NC4yNDQgNDM2LjEyNSA1NjQgNDMxLjI0N0M1NzUuMzE4IDQyNS41ODggNTg2Ljg4NyA0MjAuMjE4IDU5NyA0MTIuNDk3QzYyMi40NzcgMzkzLjA0NyA2NDQuMjc5IDM2OC42MzMgNjY4IDM0Ny4xN0M2NzguMTE1IDMzOC4wMTcgNjg3Ljc3NCAzMjguMzA1IDY5OCAzMTkuMjg2QzcwMi4yMyAzMTUuNTU1IDcwOS4zMyAzMTAuOTI0IDcxMC41MTIgMzA1LjAwMUM3MTIuNTI0IDI5NC45MDcgNjk3Ljc3NCAyOTcgNjkyIDI5N0w2NDggMjk3QzY0MC4yNTYgMjk3IDYzMS41MzcgMjk1Ljg5OCA2MjQgMjk3LjkyN0M2MDkuOTQgMzAxLjcxNCA2MDAuMzkgMzEzLjQzMyA1OTAgMzIyLjgzQzU2OC4zMTUgMzQyLjQ0MyA1NDcuNjc3IDM2My4yMTYgNTI2IDM4Mi44M0M1MTguNzg0IDM4OS4zNTkgNTExLjg4MyAzOTYuMTE0IDUwNSA0MDNDNTAwLjQxNyA0MDcuNTg0IDQ5NS41NjEgNDExLjk1MSA0OTMgNDE4eiIvPgo8cGF0aCBzdHlsZT0iZmlsbDojNTQ1YzY3OyBzdHJva2U6bm9uZTsiIGQ9Ik00NjYgMzA4TDQ3MyAzMDZDNDcyLjMzOSAzMDQuNjAzIDQ3Mi4wMzYgMzA0LjE4NiA0NzEgMzAzQzQ3NS4zNjkgMzAxLjU0NCA0NzkuNDA4IDI5OS42NzkgNDg0IDI5OUM0NzcuMDcxIDI5Ni4xNzUgNDY4LjkyNSAzMDEuODYxIDQ2NiAzMDgiLz4KPHBhdGggc3R5bGU9ImZpbGw6IzI5NDFkYjsgc3Ryb2tlOm5vbmU7IiBkPSJNMzkyIDM4NUMzOTcuNzA3IDM4Ny4zOTUgNDA1Ljg0NiAzODYgNDEyIDM4Nkw0NTMgMzg2QzQ0Ny4yOTMgMzgzLjYwNSA0MzkuMTU0IDM4NSA0MzMgMzg1TDM5MiAzODV6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiM0OGFlZmQ7IHN0cm9rZTpub25lOyIgZD0iTTQwNCA0MTFDNDAxLjQ2NyA0MDIuMTYgNDExLjE3NyAzOTEuNDY2IDQxOCAzODdDNDE1LjEwOSAzODUuNzg3IDQxMi4xMzEgMzg2LjAwMSA0MDkgMzg2QzQwMi4wMjQgMzg1Ljk5OCAzOTIuMDA1IDM4NC4xNTMgMzg2LjEwNSAzODguNjUzQzM3OC4zNzkgMzk0LjU0NSAzNzkuOTkgNDA4LjI3NiAzOTAuMDA0IDQxMC42MDZDMzk0LjQyIDQxMS42MzMgMzk5LjQ4OSA0MTEgNDA0IDQxMXoiLz4KPHBhdGggc3R5bGU9ImZpbGw6IzIxYThmYzsgc3Ryb2tlOm5vbmU7IiBkPSJNNDA0IDQxMEMzOTkuNzM5IDQxMS4yNTkgMzk1LjQyMyA0MTEgMzkxIDQxMUMzOTYuMjE3IDQxMy4xODkgNDAzLjM4MSA0MTIgNDA5IDQxMkw0MzkgNDEyQzQ0NC4xNDIgNDEyIDQ1MC4wMzMgNDEyLjc2MSA0NTQuOTk5IDQxMS4xOTZDNDY0LjYwMiA0MDguMTY5IDQ2Ny4xOTUgMzk0LjY4NiA0NTguOTU2IDM4OC42NTNDNDUxLjAzOSAzODIuODU1IDQzNC4zOTkgMzg1Ljk0IDQyNSAzODYuMDAxQzQyMS4wOCAzODYuMDI2IDQxNy40NDUgMzg2LjM1OSA0MTQuMjYzIDM4OC45MkM0MTAuMzIxIDM5Mi4wOTMgMzk5LjYgNDA1LjAxNyA0MDQgNDEweiIvPgo8cGF0aCBzdHlsZT0iZmlsbDojNzg0OGY5OyBzdHJva2U6bm9uZTsiIGQ9Ik00ODAgNDQyQzQ4Ni44MDEgNDQxLjk5IDQ5My45MzIgNDQ0LjIzMSA1MDAgNDQ3QzQ5OC43MDQgNDQ4LjU5NCA0OTguNDY1IDQ0OS4wMTggNDk4IDQ1MUM1MDAuNzE1IDQ1Mi41IDUwMi45MjggNDUzLjU2IDUwNiA0NTRMNTA1IDQ1N0w1MDggNDU5TDUwMiA0NjJDNTA1LjczMSA0NjIuOTkxIDUwOC44MjUgNDYwLjQ5OSA1MTIgNDU4LjZDNTE4LjIxOCA0NTQuODgyIDUyNC4zMDMgNDUwLjgwMyA1MzEgNDQ4QzUyNi4zNzggNDQ0LjYzMyA1MjAuNTkxIDQ0OS4yMjYgNTE2Ljc3OCA0NDYuMDE2QzUxNC4xMTggNDQzLjc3NyA1MTUuNjUyIDQzOS4wNiA1MTUuMDk3IDQzNkM1MTMuOTQgNDI5LjYxNSA1MTEuNjA5IDQyNi4zMzEgNTA2Ljk2OCA0MjEuODY1QzUwNS4zMTggNDIwLjI3NyA1MDMuNzM4IDQxOS4wNDkgNTA1IDQxN0M0OTEuMzc4IDQxMS40MzEgNDgxLjg0NSA0MzEuMzE4IDQ4MCA0NDJ6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiMyOTQxZGI7IHN0cm9rZTpub25lOyIgZD0iTTYwMSA0MTlDNjAxLjE5NSA0MjYuMjYzIDU5Ni40MDkgNDI3LjgzNSA1OTIuMTc0IDQzMi43MDRDNTg3Ljk0MSA0MzcuNTcxIDU4NC41NDcgNDQyLjgzMiA1NzkuNTYxIDQ0Ny4wNzZDNTc2LjM3NSA0NDkuNzg5IDU3Mi40NDcgNDUxLjMyNCA1NjkuMTc0IDQ1My45MTNDNTY2LjQxMiA0NTYuMDk3IDU2NC40NTYgNDU5LjI1NiA1NjEuNjI1IDQ2MS4yOThDNTU5LjgyNSA0NjIuNTk2IDU1Ny40MTQgNDYyLjY1OCA1NTUuNjk5IDQ2NC4wMTJDNTUxLjQ4MyA0NjcuMzQ0IDU1MC44MTYgNDczLjQ5OSA1NDYgNDc3TDU0NiA0NzlDNTUxLjgxNyA0ODMuMTA1IDU1Ni41MDQgNDg4LjcxNCA1NjEuNDI0IDQ5My44MzFDNTcwLjIwMiA1MDIuOTU5IDU3OS4wMzUgNTEyLjAzNSA1ODggNTIxQzU5MS4yMzcgNTE5LjgyOCA1OTIuMzg1IDUxOS43MzcgNTk1IDUyMkw2MDIgNTE3QzYwMS41OTQgNTE0LjkwNyA2MDEuNzgzIDUxNC45OCA2MDAgNTE0TDYwOSA1MDhDNjA0LjY1IDUwMC4yMjMgNjA2LjkxOSA0OTMuNjA1IDYxNSA0OTBDNjE1LjkyMSA0ODYuNjU3IDYxOC40MjUgNDg0LjQ2OCA2MTkgNDgxTDYyMyA0ODBMNjIyIDQ3NkM2MjIuNjEgNDc2IDYyNS42MSA0NzYuMzkgNjI2IDQ3NkM2MjcuNjE2IDQ3NC4zODQgNjI2LjA3IDQ3My41NDkgNjI3IDQ3MkM2MjcuNjgyIDQ3MC44NjMgNjI4Ljk4OSA0NzAuMDExIDYzMCA0NjlMNjMxIDQ3MEM2MzEuNDI5IDQ2Ni43MjMgNjM0LjEwOCA0NTguMjA4IDYzOC42MTQgNDU4Ljc2NUM2NDAuNzgxIDQ1OS4wMzQgNjQzLjI2NSA0NjEuNzg5IDY0NSA0NjNDNjM3LjE3NyA0NTEuODk0IDYyNS41OTkgNDQyLjYwMyA2MTYgNDMzQzYxMS4zMTIgNDI4LjMxIDYwNy4wMjEgNDIxLjg2NyA2MDEgNDE5eiIvPgo8cGF0aCBzdHlsZT0iZmlsbDojMjFhOGZjOyBzdHJva2U6bm9uZTsiIGQ9Ik0zNDMgNDI4QzM0NC4yNDggNDI4LjY4NSAzNDQuNTQ4IDQyOC43NDkgMzQ2IDQyOUMzNDIuODQ3IDQzMC41NzcgMzM5LjM0NCA0MzEuNDg0IDMzNyA0MzVDMzM2LjA0IDQzNi40NDEgMzM1Ljk0MyA0MzguNDI5IDMzNSA0NDBMMzM0IDQzOUMzMzQuMDEgNDQyLjczNSAzMzMuOTE1IDQ0Ni41NDQgMzM1LjU3MyA0NDkuOTk5QzMzNi42MTcgNDUyLjE3NiAzMzguMTU5IDQ1NC4wNzQgMzQwLjA0NCA0NTUuNTgxQzM1OC4wMDggNDY5Ljk0NyAzNzYuMzUzIDQzNi4yNjYgMzU0Ljk4NSA0MjguODU0QzM1MS4yMjUgNDI3LjU1IDM0Ni45MTcgNDI4IDM0MyA0Mjh6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiM0OGFlZmQ7IHN0cm9rZTpub25lOyIgZD0iTTMzNSA0NDBDMzM4LjE2NyA0MzUuNTE1IDM0MC41ODggNDMxLjg0MSAzNDYgNDMwQzMzOS42ODYgNDI3Ljg0MSAzMzUuNjEgNDM0LjUyIDMzNSA0NDB6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiMyMWE4ZmM7IHN0cm9rZTpub25lOyIgZD0iTTM4NiA0MzJDMzg2LjU5OCA0MzMuMTk1IDM4Ni40NjYgNDMyLjk3NyAzODggNDM0TDM4MCA0MzdDMzc3LjE0OCA0NDQuODI2IDM3Ny44ODkgNDU0Ljc1OCAzODcuMDAxIDQ1OC4yNThDMzkxLjE0OSA0NTkuODUxIDM5Ni42MzMgNDU5IDQwMSA0NTlMNDI4IDQ1OUM0MjcuMDIgNDU3LjIxNyA0MjcuMDkyIDQ1Ny40MDYgNDI1IDQ1N0M0MjYuNjMyIDQ1NS4wNzQgNDI2Ljk2NiA0NTQuNDg5IDQyNyA0NTJDNDI5LjIwNyA0NTAuNDI4IDQyOS4zMDMgNDQ5LjY4MiA0MjkgNDQ3QzQzNC4yMTMgNDQ1LjA0NyA0MzYuNzkgNDQwLjY4NCA0NDEuNDMxIDQzOC4wNjVDNDQ0LjM5NSA0MzYuMzkyIDQ0Ny41NiA0MzYuNjQ4IDQ0OCA0MzNMNDUyIDQzM0M0NDUuODA2IDQzMC40MDEgNDM2LjY4NiA0MzIgNDMwIDQzMkM0MTUuNDggNDMyIDQwMC4zNTcgNDI5LjMzNSAzODYgNDMyeiIvPgo8cGF0aCBzdHlsZT0iZmlsbDojMjk0MWRiOyBzdHJva2U6bm9uZTsiIGQ9Ik00MTAgNDMxQzQxNC4yMTUgNDMyLjc2OSA0MTkuNDY0IDQzMiA0MjQgNDMyTDQ1MiA0MzJDNDQ3Ljc4NSA0MzAuMjMxIDQ0Mi41MzYgNDMxIDQzOCA0MzFMNDEwIDQzMSIvPgo8cGF0aCBzdHlsZT0iZmlsbDojMjk0MWRiOyBzdHJva2U6bm9uZTsiIGQ9Ik00NDggNDMzQzQ0Ny41MzkgNDM2LjU1MSA0NDQuMjQ2IDQzNi4xNTUgNDQxLjM4OSA0MzcuNTgzQzQzNi44MDggNDM5Ljg3NCA0MzMuNjQgNDQ0LjQ2MiA0MjkgNDQ3QzQyOC44MTcgNDQ5LjQyOCA0MjguNTc3IDQ1MC4xNyA0MjcgNDUyQzQyNi44MDEgNDU0LjEwNiA0MjYuNTQ0IDQ1NC41NDMgNDI1IDQ1Nkw0MjggNDU5TDM4OSA0NTlDMzkzLjk2OSA0NjEuMDg1IDQwMC42NSA0NjAgNDA2IDQ2MEw0NDAgNDYwQzQ0Ni41NzkgNDYwIDQ1My4zMzYgNDYwLjU4MSA0NTguODkyIDQ1Ni4zMTJDNDY2LjE5MiA0NTAuNzAyIDQ2NS41MjUgNDM3LjM4MSA0NTYuOTg1IDQzMy4xOTRDNDU0LjEzNiA0MzEuNzk3IDQ1MC45ODcgNDMyLjYzMSA0NDggNDMzIi8+CjxwYXRoIHN0eWxlPSJmaWxsOiM0OGFlZmQ7IHN0cm9rZTpub25lOyIgZD0iTTM4MSA0MzhMMzg4IDQzNEMzODQuNDUyIDQzMy4wNjYgMzgyLjYwMiA0MzQuOTQ1IDM4MSA0Mzh6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiMyOTQxZGI7IHN0cm9rZTpub25lOyIgZD0iTTQ3OSA0NDFDNDc0LjczMiA0NTQuNDM3IDQ3MS4xNCA0NjguMjYyIDQ2OCA0ODJDNDY5LjMgNDgxLjM1IDQ2OSA0ODEuODUzIDQ2OSA0ODBDNDcwLjc1MyA0ODIuNTc4IDQ3Mi4xMTYgNDgzLjgxNSA0NzUgNDg1QzQ3MS40MDIgNDg5LjIzMSA0NjguMTMzIDQ5My44NiA0NjYgNDk5QzQ2NS4wMTQgNDk3LjUyMiA0NjUgNDk3Ljc5NyA0NjUgNDk2QzQ1My44MzUgNTIxLjg4MiA0ODYuNjQyIDU0Mi40MzUgNTAzIDU1NS43MzlDNTEwLjM1MyA1NjEuNzIgNTIwLjQ1NiA1NzIuMzEyIDUzMC45ODEgNTY2LjgyMUM1MzkuMjk4IDU2Mi40ODIgNTM3IDU0OS43MiA1MzcgNTQyTDUzNyA0NzBDNTIxLjY3MSA0NzEuMzc1IDUwNi4yMjkgNDc0LjIwOCA0OTEgNDc0QzQ5NC40OTQgNDY5LjcwOCA0OTkuMTg2IDQ2Ni42ODMgNTA0IDQ2NEM1MDMuNDAyIDQ2Mi44MDUgNTAzLjUzNCA0NjMuMDIzIDUwMiA0NjJDNTA0LjIyMiA0NjEuMTkgNTA1Ljk5IDQ2MC4yNjEgNTA4IDQ1OUM1MDYuODYxIDQ1Ny45ODUgNTA2LjM4OCA0NTcuNjkxIDUwNSA0NTdDNTA1Ljk4NiA0NTUuNTIxIDUwNiA0NTUuNzk3IDUwNiA0NTRDNTAzLjE4OSA0NTMuMjk5IDUwMC42OTYgNDUyLjA1OSA0OTggNDUxTDUwMCA0NDdDNDkzLjg4IDQ0My4wMDMgNDg2LjE5NiA0NDIuMzI1IDQ3OSA0NDEiLz4KPHBhdGggc3R5bGU9ImZpbGw6Izc4NDhmOTsgc3Ryb2tlOm5vbmU7IiBkPSJNNjMxIDQ3MEM2MjcuMTI5IDQ3MC40NzggNjI1Ljk2OCA0NzQuODEyIDYyMiA0NzZMNjIzIDQ4MEw2MTkgNDgxQzYxOC4wNzkgNDg0LjM0NCA2MTUuNTc1IDQ4Ni41MzIgNjE1IDQ5MEM2MDcuOTcxIDQ5MS45MTYgNjAyLjIyNiA1MDEuMTY1IDYwOSA1MDdDNjA2LjEyNSA1MDkuMzk5IDYwMy40NTYgNTExLjUzNCA2MDAgNTEzTDYwMiA1MTdDNTk5LjA5MyA1MTcuOTU5IDU5Ny40MjUgNTIwLjE3IDU5NSA1MjJDNTkzLjE0MiA1MTkuNDI4IDU5Mi4wNjUgNTE5LjI3MiA1ODkgNTIwQzU5MS42MTQgNTI1LjYwNSA1OTYuNjY4IDUyOS42NjggNjAxIDUzNEM2MDcuNDU4IDU0MC40NTggNjEzLjU2OSA1NDcuNzU1IDYyMiA1NTEuNjc2QzYzMC4zMzQgNTU1LjU1MiA2MzkuMDUxIDU1NSA2NDggNTU1TDY4MyA1NTVDNjkzLjUyIDU1NSA3MDUuNjUxIDU1Ni42ODMgNzE1Ljk5NiA1NTQuNzcyQzcyMC4yODIgNTUzLjk3OSA3MjMuMjYzIDU1MC40NjYgNzIyLjcyOCA1NDZDNzIxLjg0NiA1MzguNjQ5IDcxMC45NjUgNTMwLjEwNSA3MDUuOTg1IDUyNUM2OTAuMzYxIDUwOC45ODMgNjc0LjgwOCA0OTIuODA4IDY1OSA0NzdMNjQ2IDQ2NC4wMDFDNjQ0LjA4MiA0NjIuMDk5IDY0MS44MDQgNDU5LjEyMSA2MzkuMDQgNDU4LjQ2MUM2MzMuNzU3IDQ1Ny4yMDEgNjMxLjI0OSA0NjYuMjkyIDYzMSA0NzB6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOiM3ODQ4Zjk7IHN0cm9rZTpub25lOyIgZD0iTTQ2OSA0ODBDNDY3LjAxNiA0ODYuMjA2IDQ2NS4yODIgNDkyLjQ2MSA0NjUgNDk5QzQ2OS4wMzEgNDk1LjAwNCA0NzIuMDI3IDQ4OS44MjMgNDc1IDQ4NUM0NzIuNjM2IDQ4My41NjMgNDcwLjg4MiA0ODIuMDIgNDY5IDQ4MHoiLz4KPC9zdmc+Cg==';

function buildInvoiceHtml(inv: InvoiceForPdf, user: UserForPdf, plan?: string): string {
  const displayEmail = (user.show_phone_on_invoice === false && user.invoice_email) ? user.invoice_email : user.email;
  const displayPhone = (user.show_phone_on_invoice === false && user.invoice_phone) ? user.invoice_phone : user.phone;
  const words = amountInWords(inv.total_amount || 0);
  const headerColor = inv.template_id === 'corporate' ? '#1E293B' : '#0D0F1A';
  const accentColor = inv.invoice_accent_color || '#E8921A';

  // Escape HTML entities to prevent XSS in PDF output
  const esc = (s: string | null | undefined): string => {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Invoice ${esc(inv.invoice_number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #1a1a1a; background: #fff; padding: 32px; }
  .hdr { background: ${headerColor}; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
  .hdr-left h1 { font-size: 9px; letter-spacing: .12em; opacity: .7; text-transform: uppercase; margin-bottom: 4px; }
  .hdr-left h2 { font-size: 18px; font-weight: 800; letter-spacing: -.02em; }
  .hdr-right { text-align: right; font-size: 11px; opacity: .9; line-height: 1.7; }
  .rc { display: inline-block; background: rgba(255,255,255,.2); border-radius: 4px; padding: 2px 7px; font-size: 9px; margin-top: 6px; letter-spacing: .06em; }
  .body { border: 1px solid #e5e5e5; border-top: none; padding: 20px 24px; border-radius: 0 0 8px 8px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .party-label { font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
  .party-name { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
  .party-detail { font-size: 10px; color: #555; margin-top: 1px; }
  .pos { padding: 6px 10px; background: #f5f5f5; border-radius: 5px; font-size: 10px; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { padding: 8px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #666; background: #f9f9f9; border-bottom: 2px solid #e5e5e5; }
  td { padding: 9px 8px; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
  .r { text-align: right; }
  .totals { margin-left: auto; max-width: 220px; margin-top: 4px; }
  .trow { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; color: #666; }
  .trow span:last-child { font-variant-numeric: tabular-nums; }
  .tfinal { display: flex; justify-content: space-between; padding: 8px 0 0; border-top: 2px solid #1a1a1a; margin-top: 4px; }
  .tfinal span:first-child { font-weight: 800; font-size: 12px; }
  .tfinal span:last-child { font-weight: 800; font-size: 14px; color: ${accentColor}; font-variant-numeric: tabular-nums; }
  .notes { margin-top: 14px; padding: 10px 12px; background: #f9f9f9; border-radius: 6px; font-size: 10px; color: #555; line-height: 1.6; }
  .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #ccc; }
  @page { margin: 0; size: A4 portrait; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  ${plan === 'basic' ? `body::before{content:'';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);width:65%;height:65%;background:url('data:image/svg+xml;base64,${LOGO_B64}') no-repeat center/contain;opacity:.07;pointer-events:none;z-index:9999;}body::after{content:'Made with ease on Kcretio.com';position:fixed;bottom:10px;left:0;right:0;text-align:center;font-size:8px;color:#a0aec0;font-family:Arial,sans-serif;letter-spacing:.04em;pointer-events:none;z-index:9999;}` : ''}
</style>
</head><body>
<div class="hdr">
  <div class="hdr-left">
    <h1>TAX INVOICE</h1>
    <h2>${esc(inv.invoice_number)}</h2>
    ${inv.reverse_charge === 'Yes' ? '<div class="rc">REVERSE CHARGE APPLICABLE</div>' : ''}
  </div>
  <div class="hdr-right">
    <div><strong>Invoice Date:</strong> ${fmt(inv.invoice_date)}</div>
    ${inv.due_date ? `<div><strong>Due Date:</strong> ${fmt(inv.due_date)}</div>` : ''}
    ${inv.payment_terms ? `<div><strong>Payment Terms:</strong> ${esc(inv.payment_terms)}</div>` : ''}
    ${inv.purchase_order_number ? `<div><strong>PO Number:</strong> ${esc(inv.purchase_order_number)}</div>` : ''}
  </div>
</div>
<div class="body">
  <div class="parties">
    <div>
      <div class="party-label">Supplier (From)</div>
      <div class="party-name">${esc(user.business_name || user.name)}</div>
      ${user.gstin ? `<div class="party-detail">GSTIN: <strong>${esc(user.gstin)}</strong></div>` : ''}
      ${user.pan ? `<div class="party-detail">PAN: ${esc(user.pan)}</div>` : ''}
      ${displayEmail ? `<div class="party-detail">Email: ${esc(displayEmail)}</div>` : ''}
      ${displayPhone ? `<div class="party-detail">Ph: ${esc(displayPhone)}</div>` : ''}
      ${user.business_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${esc(user.business_address)}</div>` : ''}
      ${user.state_code ? `<div class="party-detail">State: ${esc(STATE_MAP[user.state_code] || '')} | Code: ${esc(user.state_code)}</div>` : ''}
    </div>
    <div>
      <div class="party-label">Recipient (Bill To)</div>
      <div class="party-name">${esc(inv.brand_name)}</div>
      ${inv.brand_gstin ? `<div class="party-detail">GSTIN: <strong>${esc(inv.brand_gstin)}</strong></div>` : ''}
      ${inv.brand_pan ? `<div class="party-detail">PAN: ${esc(inv.brand_pan)}</div>` : ''}
      ${inv.brand_email ? `<div class="party-detail">Email: ${esc(inv.brand_email)}</div>` : ''}
      ${inv.brand_phone ? `<div class="party-detail">Ph: ${esc(inv.brand_phone)}</div>` : ''}
      ${inv.brand_address ? `<div class="party-detail" style="margin-top:4px;line-height:1.4">${esc(inv.brand_address)}</div>` : ''}
      ${inv.brand_state_code ? `<div class="party-detail">State: ${esc(STATE_MAP[inv.brand_state_code] || '')} | Code: ${esc(inv.brand_state_code)}</div>` : ''}
    </div>
  </div>
  ${inv.place_of_supply ? `<div class="pos"><strong>Place of Supply:</strong> ${esc(STATE_MAP[inv.place_of_supply] || inv.place_of_supply)} (${esc(inv.place_of_supply)}) &nbsp;·&nbsp; <strong>Supply Type:</strong> ${inv.supply_type === 'intrastate' ? 'Intrastate (CGST + SGST)' : 'Interstate (IGST)'}</div>` : ''}
  <table>
    <thead><tr>
      <th>Description of Services</th><th>SAC/HSN</th><th>GST Rate</th><th class="r">Taxable Value</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${esc(inv.service_description)}</td>
        <td>${esc(inv.sac_code || '998399')}</td>
        <td>${inv.gst_rate || 18}%</td>
        <td class="r"><strong>${inr(inv.base_amount)}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="totals">
    ${inv.discount_value ? `<div class="trow"><span>Subtotal</span><span>${inr((inv.base_amount||0) + (inv.discount_value||0))}</span></div><div class="trow" style="color:#c0392b"><span>Discount${inv.discount_type==='percent'?` (${inv.discount_value}%)`:''}</span><span>−${inr(inv.discount_value)}</span></div>` : ''}
    <div class="trow"><span>Taxable Value</span><span>${inr(inv.base_amount)}</span></div>
    ${inv.supply_type === 'intrastate' ? `
    <div class="trow"><span>Add: CGST @ ${(inv.gst_rate || 18) / 2}%</span><span>${inr(inv.cgst_amount)}</span></div>
    <div class="trow"><span>Add: SGST @ ${(inv.gst_rate || 18) / 2}%</span><span>${inr(inv.sgst_amount)}</span></div>
    ` : `<div class="trow"><span>Add: IGST @ ${inv.gst_rate || 18}%</span><span>${inr(inv.igst_amount)}</span></div>`}
    <div class="tfinal"><span>Invoice Total</span><span>${inr(inv.total_amount)}</span></div>
  </div>
  <div style="margin-top:6px;font-size:9px;color:#555;font-style:italic">
    Amount Chargeable (in words): <strong>${words}</strong>
  </div>
  <div style="margin-top:6px;font-size:9px;color:#555">
    Reverse Charge: <strong>${inv.reverse_charge === 'Yes' ? 'Applicable' : 'Not Applicable'}</strong>
  </div>
  ${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${esc(inv.notes)}</div>` : ''}
  ${inv.include_bank_details && inv.bank_name ? `
  <div class="notes" style="margin-top:10px">
    <strong>Bank Details for Payment:</strong>
    <table style="margin-top:6px;font-size:10px;border:none">
      ${inv.account_holder_name ? `<tr><td style="padding:2px 0;color:#666;width:140px">Account Holder</td><td style="font-weight:700">${esc(inv.account_holder_name)}</td></tr>` : ''}
      ${inv.bank_name ? `<tr><td style="padding:2px 0;color:#666">Bank</td><td>${esc(inv.bank_name)}</td></tr>` : ''}
      ${inv.account_number ? `<tr><td style="padding:2px 0;color:#666">Account No.</td><td style="font-family:monospace">${esc(inv.account_number)}</td></tr>` : ''}
      ${inv.ifsc_code ? `<tr><td style="padding:2px 0;color:#666">IFSC Code</td><td style="font-family:monospace">${esc(inv.ifsc_code)}</td></tr>` : ''}
    </table>
  </div>` : ''}
  ${inv.include_upi && (inv.upi_id || inv.upi_scanner_url) ? `
  <div class="notes" style="margin-top:10px;display:flex;align-items:center;gap:12px">
    ${inv.upi_scanner_url ? `<img src="${inv.upi_scanner_url}" style="width:60px;height:60px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fff" />` : ''}
    <div><strong>Pay via UPI</strong>${inv.upi_id ? `<div style="font-family:monospace;font-size:10px;color:#555">${esc(inv.upi_id)}</div>` : ''}</div>
  </div>` : ''}
  ${inv.include_terms && inv.terms_text ? `
  <div class="notes" style="margin-top:10px">
    <strong>Terms &amp; Conditions:</strong>
    <div style="margin-top:4px;white-space:pre-line;color:#666">${esc(inv.terms_text)}</div>
  </div>` : ''}
  ${inv.include_signatory ? `
  <div style="margin-top:30px;display:flex;justify-content:flex-end">
    <div style="text-align:center;min-width:180px">
      ${inv.signatory_image_url ? `<img src="${inv.signatory_image_url}" style="height:48px;max-width:160px;object-fit:contain;margin-bottom:4px;border:1px solid #ddd;border-radius:4px;background:#fff;padding:4px" />` : ''}
      <div style="border-top:1px solid #1a1a1a;padding-top:6px;font-size:10px;color:#333">
        <div><strong>For ${esc(inv.seller_business_name || user.business_name || user.name)}</strong></div>
        ${inv.signatory_name ? `<div style="color:#666">Authorized Signatory: ${esc(inv.signatory_name)}</div>` : '<div style="color:#666">Authorized Signatory</div>'}
      </div>
    </div>
  </div>` : ''}
  <div class="footer">GST-compliant invoice &nbsp;·&nbsp; Kcretio.com &nbsp;·&nbsp; Subject to GST as applicable</div>
</div>
</body></html>`;
}

let browserInstance: Browser | null = null;
let pageInUse = false;

const pdfCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getChromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'linux') {
    // Render/Ubuntu uses chromium-browser; fall back to google-chrome-stable for GCE-style envs
    for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome']) {
      try { require('fs').accessSync(p); return p; } catch { /* not found */ }
    }
  }
  return 'google-chrome';
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return browserInstance;
}

export async function warmBrowser(): Promise<void> {
  try { await getBrowser(); } catch { /* non-fatal */ }
}

export async function generateInvoicePdfWithPuppeteer(
  invoice: InvoiceForPdf,
  user: UserForPdf,
  cacheKey?: string,
  plan?: string,
): Promise<Buffer> {
  const effectiveCacheKey = cacheKey ? `${cacheKey}:${plan || 'pro'}` : undefined;
  if (effectiveCacheKey) {
    const cached = pdfCache.get(effectiveCacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.buffer;
    }
  }

  while (pageInUse) {
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }
  pageInUse = true;

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    const html = buildInvoiceHtml(invoice, user, plan);
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    const buffer = Buffer.from(pdfUint8);
    if (effectiveCacheKey) {
      pdfCache.set(effectiveCacheKey, { buffer, timestamp: Date.now() });
    }
    return buffer;
  } finally {
    if (page) await page.close().catch(() => {});
    pageInUse = false;
  }
}
