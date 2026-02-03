/**
 * Serialization helpers to convert between Supabase snake_case and TypeScript camelCase
 */

import type { Contact, Conversation, Profile, UserPreferences, ConversationSegment, MatchSuggestion, CalendarEvent } from '@shared/schema';

// Type for database rows from Supabase
type DbRow = Record<string, unknown>;

// ============================================================================
// CONTACTS
// ============================================================================

export function contactFromDb(dbRow: DbRow): Contact {
  return {
    id: dbRow.id as string,
    ownedByProfile: dbRow.owned_by_profile as string,
    name: dbRow.name as string,
    firstName: dbRow.first_name as string | null,
    lastName: dbRow.last_name as string | null,
    email: dbRow.email as string | null,
    company: dbRow.company as string | null,
    title: dbRow.title as string | null,
    linkedinUrl: dbRow.linkedin_url as string | null,
    location: dbRow.location as string | null,
    phone: dbRow.phone as string | null,
    category: dbRow.category as string | null,
    twitter: dbRow.twitter as string | null,
    angellist: dbRow.angellist as string | null,
    bio: dbRow.bio as string | null,
    companyAddress: dbRow.company_address as string | null,
    companyEmployees: dbRow.company_employees as string | null,
    companyFounded: dbRow.company_founded as string | null,
    companyUrl: dbRow.company_url as string | null,
    companyLinkedin: dbRow.company_linkedin as string | null,
    companyTwitter: dbRow.company_twitter as string | null,
    companyFacebook: dbRow.company_facebook as string | null,
    companyAngellist: dbRow.company_angellist as string | null,
    companyCrunchbase: dbRow.company_crunchbase as string | null,
    companyOwler: dbRow.company_owler as string | null,
    youtubeVimeo: dbRow.youtube_vimeo as string | null,
    isShared: dbRow.is_shared as boolean | null,
    status: (dbRow.status as string) || 'verified',
    isInvestor: (dbRow.is_investor as boolean) ?? false,
    contactType: (dbRow.contact_type as string[]) || [],
    checkSizeMin: dbRow.check_size_min as number | null,
    checkSizeMax: dbRow.check_size_max as number | null,
    investorNotes: dbRow.investor_notes as string | null,
    preferredStages: dbRow.preferred_stages as string[] | null,
    preferredTeamSizes: dbRow.preferred_team_sizes as string[] | null,
    preferredTenure: dbRow.preferred_tenure as string[] | null,
    isFamilyOffice: (dbRow.is_family_office as boolean) ?? false,
    investmentTypes: dbRow.investment_types as string[] | null,
    avgCheckSize: dbRow.avg_check_size as number | null,
    createdAt: new Date(dbRow.created_at as string),
    updatedAt: new Date(dbRow.updated_at as string),
  };
}

export function contactToDb(contact: Partial<Contact>): DbRow {
  const dbRow: DbRow = {};

  // Always include fields if they're present (including null to allow clearing)
  if (contact.id !== undefined) dbRow.id = contact.id;
  if (contact.ownedByProfile !== undefined) dbRow.owned_by_profile = contact.ownedByProfile;
  if (contact.name !== undefined) dbRow.name = contact.name;
  if ('firstName' in contact) dbRow.first_name = contact.firstName;
  if ('lastName' in contact) dbRow.last_name = contact.lastName;
  if ('email' in contact) dbRow.email = contact.email;
  if ('company' in contact) dbRow.company = contact.company;
  if ('title' in contact) dbRow.title = contact.title;
  if ('linkedinUrl' in contact) dbRow.linkedin_url = contact.linkedinUrl;
  if ('location' in contact) dbRow.location = contact.location;
  if ('phone' in contact) dbRow.phone = contact.phone;
  if ('category' in contact) dbRow.category = contact.category;
  if ('twitter' in contact) dbRow.twitter = contact.twitter;
  if ('angellist' in contact) dbRow.angellist = contact.angellist;
  if ('bio' in contact) dbRow.bio = contact.bio;
  if ('companyAddress' in contact) dbRow.company_address = contact.companyAddress;
  if ('companyEmployees' in contact) dbRow.company_employees = contact.companyEmployees;
  if ('companyFounded' in contact) dbRow.company_founded = contact.companyFounded;
  if ('companyUrl' in contact) dbRow.company_url = contact.companyUrl;
  if ('companyLinkedin' in contact) dbRow.company_linkedin = contact.companyLinkedin;
  if ('companyTwitter' in contact) dbRow.company_twitter = contact.companyTwitter;
  if ('companyFacebook' in contact) dbRow.company_facebook = contact.companyFacebook;
  if ('companyAngellist' in contact) dbRow.company_angellist = contact.companyAngellist;
  if ('companyCrunchbase' in contact) dbRow.company_crunchbase = contact.companyCrunchbase;
  if ('companyOwler' in contact) dbRow.company_owler = contact.companyOwler;
  if ('youtubeVimeo' in contact) dbRow.youtube_vimeo = contact.youtubeVimeo;
  if (contact.isShared !== undefined) dbRow.is_shared = contact.isShared;
  if (contact.status !== undefined) dbRow.status = contact.status;
  if (contact.isInvestor !== undefined) dbRow.is_investor = contact.isInvestor;
  if ('contactType' in contact) dbRow.contact_type = contact.contactType;
  if ('checkSizeMin' in contact) dbRow.check_size_min = contact.checkSizeMin;
  if ('checkSizeMax' in contact) dbRow.check_size_max = contact.checkSizeMax;
  if ('investorNotes' in contact) dbRow.investor_notes = contact.investorNotes;
  if (contact.preferredStages !== undefined) dbRow.preferred_stages = contact.preferredStages;
  if (contact.preferredTeamSizes !== undefined) dbRow.preferred_team_sizes = contact.preferredTeamSizes;
  if (contact.preferredTenure !== undefined) dbRow.preferred_tenure = contact.preferredTenure;
  if (contact.isFamilyOffice !== undefined) dbRow.is_family_office = contact.isFamilyOffice;
  if (contact.investmentTypes !== undefined) dbRow.investment_types = contact.investmentTypes;
  if (contact.avgCheckSize !== undefined) dbRow.avg_check_size = contact.avgCheckSize;

  return dbRow;
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

export function calendarEventFromDb(dbRow: DbRow): CalendarEvent {
  return {
    id: dbRow.id as string,
    ownedByProfile: dbRow.owned_by_profile as string,
    title: dbRow.title as string,
    description: dbRow.description as string | null,
    startTime: new Date(dbRow.start_time as string),
    endTime: new Date(dbRow.end_time as string),
    attendees: (dbRow.attendees as string[]) || [],
    location: dbRow.location as string | null,
    meetingUrl: dbRow.meeting_url as string | null,
    externalEventId: dbRow.external_event_id as string | null,
    createdAt: new Date(dbRow.created_at as string),
    updatedAt: new Date(dbRow.updated_at as string),
  };
}

export function calendarEventToDb(event: Partial<CalendarEvent>): DbRow {
  const dbRow: DbRow = {};

  if (event.id !== undefined) dbRow.id = event.id;
  if (event.ownedByProfile !== undefined) dbRow.owned_by_profile = event.ownedByProfile;
  if (event.title !== undefined) dbRow.title = event.title;
  if ('description' in event) dbRow.description = event.description;
  if (event.startTime !== undefined) dbRow.start_time = event.startTime.toISOString();
  if (event.endTime !== undefined) dbRow.end_time = event.endTime.toISOString();
  if (event.attendees !== undefined) dbRow.attendees = event.attendees;
  if ('location' in event) dbRow.location = event.location;
  if ('meetingUrl' in event) dbRow.meeting_url = event.meetingUrl;
  if ('externalEventId' in event) dbRow.external_event_id = event.externalEventId;

  return dbRow;
}

export function conversationFromDb(dbRow: DbRow): Conversation {
  return {
    id: dbRow.id as string,
    ownedByProfile: dbRow.owned_by_profile as string,
    eventId: dbRow.event_id as string | null,
    title: dbRow.title as string,
    durationSeconds: dbRow.duration_seconds as number | null,
    recordedAt: new Date(dbRow.recorded_at as string),
    status: dbRow.status as string,
    createdAt: new Date(dbRow.created_at as string),
  };
}

export function conversationToDb(conversation: Partial<Conversation>): DbRow {
  const dbRow: DbRow = {};

  if (conversation.id !== undefined) dbRow.id = conversation.id;
  if (conversation.ownedByProfile !== undefined) dbRow.owned_by_profile = conversation.ownedByProfile;
  if ('eventId' in conversation) dbRow.event_id = conversation.eventId;
  if (conversation.title !== undefined) dbRow.title = conversation.title;
  if (conversation.durationSeconds !== undefined) dbRow.duration_seconds = conversation.durationSeconds;
  if (conversation.recordedAt !== undefined) dbRow.recorded_at = conversation.recordedAt.toISOString();
  if (conversation.status !== undefined) dbRow.status = conversation.status;

  return dbRow;
}

// ============================================================================
// CONVERSATION SEGMENTS
// ============================================================================

export function segmentFromDb(dbRow: DbRow): ConversationSegment {
  return {
    id: dbRow.id as string,
    conversationId: dbRow.conversation_id as string,
    timestampMs: dbRow.timestamp_ms as number,
    speaker: dbRow.speaker as string,
    text: dbRow.text as string,
    createdAt: new Date(dbRow.created_at as string),
  };
}

export function segmentToDb(segment: Partial<ConversationSegment>): DbRow {
  const dbRow: DbRow = {};

  if (segment.id !== undefined) dbRow.id = segment.id;
  if (segment.conversationId !== undefined) dbRow.conversation_id = segment.conversationId;
  if (segment.timestampMs !== undefined) dbRow.timestamp_ms = segment.timestampMs;
  if (segment.speaker !== undefined) dbRow.speaker = segment.speaker;
  if (segment.text !== undefined) dbRow.text = segment.text;

  return dbRow;
}

// ============================================================================
// PROFILES
// ============================================================================

export function profileFromDb(dbRow: DbRow): Profile {
  return {
    id: dbRow.id as string,
    email: dbRow.email as string,
    fullName: dbRow.full_name as string | null,
    role: dbRow.role as string,
    onboardingCompleted: dbRow.onboarding_completed as boolean,
    createdAt: new Date(dbRow.created_at as string),
    updatedAt: new Date(dbRow.updated_at as string),
  };
}

export function profileToDb(profile: Partial<Profile>): DbRow {
  const dbRow: DbRow = {};

  if (profile.id !== undefined) dbRow.id = profile.id;
  if (profile.email !== undefined) dbRow.email = profile.email;
  if (profile.fullName !== undefined) dbRow.full_name = profile.fullName;
  if (profile.role !== undefined) dbRow.role = profile.role;
  if (profile.onboardingCompleted !== undefined) dbRow.onboarding_completed = profile.onboardingCompleted;

  return dbRow;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export function preferencesFromDb(dbRow: DbRow): UserPreferences {
  return {
    profileId: dbRow.profile_id as string,
    autoTranscribe: dbRow.auto_transcribe as boolean,
    notificationEmail: dbRow.notification_email as boolean,
    matchThreshold: dbRow.match_threshold as number,
    createdAt: new Date(dbRow.created_at as string),
  };
}

export function preferencesToDb(prefs: Partial<UserPreferences>): DbRow {
  const dbRow: DbRow = {};

  if (prefs.profileId !== undefined) dbRow.profile_id = prefs.profileId;
  if (prefs.autoTranscribe !== undefined) dbRow.auto_transcribe = prefs.autoTranscribe;
  if (prefs.notificationEmail !== undefined) dbRow.notification_email = prefs.notificationEmail;
  if (prefs.matchThreshold !== undefined) dbRow.match_threshold = prefs.matchThreshold;

  return dbRow;
}

// ============================================================================
// MATCH SUGGESTIONS
// ============================================================================

export function matchFromDb(dbRow: DbRow): MatchSuggestion {
  return {
    id: dbRow.id as string,
    conversationId: dbRow.conversation_id as string,
    contactId: dbRow.contact_id as string,
    score: dbRow.score as number,
    reasons: dbRow.reasons as string[],
    justification: dbRow.justification as string | null,
    status: dbRow.status as string,
    promiseStatus: dbRow.promise_status as string | null,
    promisedAt: dbRow.promised_at ? new Date(dbRow.promised_at as string) : null,
    createdAt: new Date(dbRow.created_at as string),
    updatedAt: new Date(dbRow.updated_at as string),
  };
}
