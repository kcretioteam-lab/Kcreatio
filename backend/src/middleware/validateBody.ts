import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Plain-English names for fields users see in forms
const FIELD_LABELS: Record<string, string> = {
  brandName: 'brand name', brandGstin: 'brand GSTIN', brandPan: 'brand PAN', brandAddress: 'brand address',
  brandStateCode: 'brand state', brandEmail: 'brand email', brandPhone: 'brand phone', brandTan: 'TAN',
  brandContactEmail: 'brand email', dealValue: 'deal value', baseAmount: 'amount', amount: 'amount',
  invoiceAmount: 'taxable value', amountReceived: 'amount received', tdsDeducted: 'TDS amount', tdsAmount: 'TDS amount',
  tdsRate: 'TDS rate', gstRate: 'GST rate', paymentDate: 'payment date', incomeDate: 'income date',
  expenseDate: 'expense date', invoiceDate: 'invoice date', dueDate: 'due date', paidDate: 'payment date',
  amountPaid: 'amount paid', serviceDescription: 'service description', description: 'description',
  source: 'income source', category: 'category', email: 'email', password: 'password', name: 'name',
  phone: 'phone number', gstin: 'GSTIN', pan: 'PAN', state_code: 'state', invoice_prefix: 'invoice prefix',
  placeOfSupply: 'place of supply', otp: 'code', lineItems: 'service line',
};

const MONEY_FIELDS = new Set(['dealValue', 'baseAmount', 'amount', 'invoiceAmount', 'amountReceived', 'amountPaid']);

// Zod's own messages ("Too small: expected number to be >0") are for developers.
const IS_DEFAULT_MESSAGE = /^(Too (small|big)|Invalid|Expected|Required)/;

function labelFor(path: PropertyKey[]): { key: string; label: string } {
  const key = String([...path].reverse().find(p => typeof p === 'string') ?? '');
  const label = FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
  return { key, label: label || 'this field' };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function friendlyMessage(issue: any): string {
  if (issue.message && !IS_DEFAULT_MESSAGE.test(issue.message)) return issue.message;
  const { key, label } = labelFor(issue.path ?? []);
  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? `${cap(label)} is required` : `${cap(label)} must be at least ${issue.minimum} characters`;
      if (issue.origin === 'array') return `Add at least one ${label}`;
      if (MONEY_FIELDS.has(key) && Number(issue.minimum) === 0) return `Enter ${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label} above ₹0`;
      return `${cap(label)} must be ${issue.inclusive === false ? 'more than' : 'at least'} ${issue.minimum}`;
    case 'too_big':
      if (issue.origin === 'string') return `${cap(label)} is too long (max ${issue.maximum} characters)`;
      return `${cap(label)} is too large`;
    case 'invalid_value':
    case 'invalid_enum_value':
      return `Choose a valid ${label}`;
    case 'invalid_type':
      return issue.input === undefined || issue.received === 'undefined' ? `${cap(label)} is required` : `Enter a valid ${label}`;
    case 'invalid_format':
    case 'invalid_string':
      return `Enter a valid ${label}`;
    default:
      return `Please check the ${label}`;
  }
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
      const first = issues[0] ?? { message: 'Please check the form and try again.', path: [] };
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: friendlyMessage(first),
        field: first.path?.join('.'),
        statusCode: 422,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
