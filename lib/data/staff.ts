import { randomUUID } from 'node:crypto';
import type { DB } from './db';
import type { UserRole } from '@/lib/types/domain';

const INTERNAL_EMAIL_DOMAIN = 'staff.unique.internal';

export interface StaffRow {
  id: string;
  fullName: string;
  role: UserRole;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
}

interface RawStaffRow {
  id: string;
  full_name: string;
  role: UserRole;
  store_id: string | null;
  is_active: boolean;
  stores: { name: string } | null;
}

function toStaffRow(row: RawStaffRow): StaffRow {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    storeId: row.store_id,
    storeName: row.stores?.name ?? null,
    isActive: row.is_active,
  };
}

export async function listStaff(supabase: DB): Promise<StaffRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, store_id, is_active, stores(name)')
    .order('full_name');

  if (error) throw error;
  return ((data ?? []) as unknown as RawStaffRow[]).map(toStaffRow);
}

export interface RosterEntry {
  id: string;
  fullName: string;
}

/** Public roster for the tap-your-name login screen — active staff only, name + id, nothing sensitive. */
export async function listActiveRoster(supabase: DB): Promise<RosterEntry[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }));
}

export interface CreateStaffInput {
  fullName: string;
  pin: string;
  role: UserRole;
  storeId: string | null;
}

/**
 * Server-only — requires the service-role client (auth.admin API).
 * Login is name + PIN only; `profiles` has no email column at all. The PIN
 * is stored purely as the Supabase Auth password on a synthetic
 * `<random>@staff.unique.internal` address that's never shown to anyone —
 * login resolves it server-side via `auth.admin.getUserById(profileId)`.
 */
export async function createStaffAccount(adminClient: DB, input: CreateStaffInput): Promise<string> {
  const internalEmail = `${randomUUID()}@${INTERNAL_EMAIL_DOMAIN}`;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: internalEmail,
    password: input.pin,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw createError ?? new Error('Failed to create auth user');
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: created.user.id,
    full_name: input.fullName,
    role: input.role,
    store_id: input.storeId,
    is_active: true,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    throw profileError;
  }

  return created.user.id;
}

export async function setStaffActive(supabase: DB, staffId: string, isActive: boolean): Promise<void> {
  const { data: target, error: fetchError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', staffId)
    .single();

  if (fetchError) throw fetchError;
  if (target.role === 'owner') {
    throw new Error('The owner account cannot be deactivated');
  }

  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', staffId);
  if (error) throw error;
}

export class InvalidPinError extends Error {
  constructor() {
    super('Incorrect PIN.');
    this.name = 'InvalidPinError';
  }
}

/**
 * Server-only — requires the service-role client. Resolves the profile's
 * synthetic auth email via `auth.admin.getUserById`, then signs in against
 * that email + the submitted PIN using the given anon/cookie-aware client
 * (so the resulting session lands in the response's Set-Cookie headers).
 */
export async function signInByProfileId(adminClient: DB, sessionClient: DB, profileId: string, pin: string) {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, is_active')
    .eq('id', profileId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || !profile.is_active) throw new InvalidPinError();

  const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profileId);
  if (authError || !authUser.user?.email) throw new InvalidPinError();

  const { data: session, error: signInError } = await sessionClient.auth.signInWithPassword({
    email: authUser.user.email,
    password: pin,
  });

  if (signInError || !session.user) throw new InvalidPinError();
}
