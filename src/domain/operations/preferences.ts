import { formatATC } from '../money';
import type {
  AlertPreference,
  TrustedContact,
} from '../models';
import type {
  OperationContext,
  OperationPlan,
  SupportOperationName,
} from './types';
import {
  appendAudit,
  optionalMinor,
  requiredBoolean,
  requiredString,
  slug,
} from './utils';

type PreferenceOperationName = Extract<
  SupportOperationName,
  'set_alert_preference' | 'set_accessibility_mode' | 'manage_trusted_contact'
>;

function prepareAlert(context: OperationContext): OperationPlan {
  const event = requiredString(context.args, 'event');
  if (!['large-payment', 'low-balance', 'card-use', 'security'].includes(event)) {
    throw new Error('event is not a supported alert type');
  }
  const channel = requiredString(context.args, 'channel');
  if (!['in-app', 'email-simulation'].includes(channel)) {
    throw new Error('channel must be in-app or email-simulation');
  }
  const threshold = optionalMinor(context.args, 'thresholdMinor', { allowZero: true }) ?? null;
  const enabled = requiredBoolean(context.args, 'enabled');
  const id = `alert-${slug(event)}-${slug(channel)}`;
  const detail = threshold === null
    ? `${event} alert ${enabled ? 'enabled' : 'disabled'}`
    : `${event} alert at ${formatATC(threshold)} ${enabled ? 'enabled' : 'disabled'}`;
  return {
    title: `Change ${event} alert`,
    risk: 'low',
    disclosure: [],
    consequences: [detail, `Simulated channel: ${channel}`],
    reducer(draft) {
      const existing = draft.alerts.find((alert) =>
        alert.event === event && alert.channel === channel);
      const next: AlertPreference = {
        id: existing?.id ?? id,
        event: event as AlertPreference['event'],
        channel: channel as AlertPreference['channel'],
        threshold,
        enabled,
      };
      if (existing) {
        Object.assign(existing, next);
      } else {
        draft.alerts.push(next);
      }
      appendAudit(draft, context, next.id, detail);
    },
  };
}

function prepareAccessibility(context: OperationContext): OperationPlan {
  const mode = requiredString(context.args, 'mode');
  if (!['largeText', 'highContrast', 'reducedMotion', 'plainLanguage'].includes(mode)) {
    throw new Error('mode is not a supported accessibility preference');
  }
  const enabled = requiredBoolean(context.args, 'enabled');
  const labels = {
    largeText: 'Large text',
    highContrast: 'High contrast',
    reducedMotion: 'Reduced motion',
    plainLanguage: 'Plain-language labels',
  } as const;
  const key = mode as keyof typeof labels;
  return {
    title: `Change ${labels[key].toLocaleLowerCase('en-US')}`,
    risk: 'low',
    disclosure: [],
    consequences: [`${labels[key]}: ${enabled ? 'on' : 'off'}`],
    reducer(draft) {
      draft.user.preferences.accessibility[key] = enabled;
      appendAudit(
        draft,
        context,
        `accessibility:${key}`,
        `${labels[key]} turned ${enabled ? 'on' : 'off'}.`,
      );
    },
  };
}

function parseContact(value: unknown): TrustedContact {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('contact is required when setting a trusted contact');
  }
  const args = value as Record<string, unknown>;
  return {
    name: requiredString(args, 'name', 80),
    relationship: requiredString(args, 'relationship', 60),
    contact: requiredString(args, 'contact', 120),
  };
}

function prepareTrustedContact(context: OperationContext): OperationPlan {
  const action = requiredString(context.args, 'action');
  if (!['set', 'remove'].includes(action)) {
    throw new Error('action must be set or remove');
  }
  if (action === 'remove') {
    const existing = context.state.user.preferences.trustedContact;
    if (!existing) {
      throw new Error('No trusted contact is configured');
    }
    return {
      title: 'Remove trusted contact',
      risk: 'critical',
      disclosure: [],
      consequences: [`Remove ${existing.name} as the trusted contact`],
      reducer(draft) {
        draft.user.preferences.trustedContact = null;
        appendAudit(draft, context, 'trusted-contact', 'Trusted contact removed.');
      },
    };
  }

  const contact = parseContact(context.args.contact);
  return {
    title: `Set ${contact.name} as trusted contact`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Trusted contact: ${contact.name}`,
      `Relationship: ${contact.relationship}`,
      'This prototype never sends messages outside the device',
    ],
    reducer(draft) {
      draft.user.preferences.trustedContact = contact;
      appendAudit(draft, context, 'trusted-contact', `${contact.name} set as trusted contact.`);
    },
  };
}

export function preparePreferenceOperation(
  context: OperationContext,
  operation: PreferenceOperationName,
): OperationPlan {
  switch (operation) {
    case 'set_alert_preference':
      return prepareAlert(context);
    case 'set_accessibility_mode':
      return prepareAccessibility(context);
    case 'manage_trusted_contact':
      return prepareTrustedContact(context);
  }
}
