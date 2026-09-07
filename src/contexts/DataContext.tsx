import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useMemo, useRef } from 'react';
import { MealRegistration, ClassInfo, User, Role, Announcement, AuditLog, AuditLogAction, MealType } from '../types';
import { supabase } from '../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';


interface DataContextType {
  editingInfo: { className: string; date: string } | null;
  classes: ClassInfo[];
  users: User[];
  announcements: Announcement[];
  unreadAnnouncementsCount: number;
  hasMoreAnnouncements: boolean;
  loadMoreAnnouncements: () => void;
  dataVersion: number; // Used to trigger refetches in components
  recentlyUpdatedKeys: Set<string>; // For UI highlighting
  showBackupPrompt: boolean;
  isAnnouncementRead: (ann: Announcement) => boolean;
  addRegistrations: (newRegistrations: Omit<MealRegistration, 'id' | 'updatedAt'>[]) => Promise<void>;
  updateRegistrations: (updates: Omit<MealRegistration, 'id' | 'updatedAt'>[], originals: MealRegistration[]) => Promise<void>;
  requestEdit: (className: string, date: string) => void;
  clearEditing: () => void;
  deleteRegistrations: (className: string, date: string) => Promise<void>;
  deleteMultipleRegistrationsByDate: (items: {className: string, date: string}[]) => Promise<void>;
  addClass: (newClass: Omit<ClassInfo, 'id' | 'updatedAt'>) => Promise<boolean>;
  updateClass: (classId: string, updatedData: Omit<ClassInfo, 'id' | 'updatedAt'>) => Promise<boolean>;
  deleteClass: (classToDelete: ClassInfo) => Promise<void>;
  getRegistrations: (options: {
    dates?: string[],
    classNames?: string[],
    dateRange?: {from: string, to: string},
    limit?: number,
    offset?: number,
    getAll?: boolean,
    skipCount?: boolean
  }) => Promise<{
    registrations: MealRegistration[],
    totalCount: number,
    hasMore: boolean
  }>;
  updateUser: (userId: string, updatedData: Partial<Omit<User, 'id'>>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<void>;
  approveUser: (userId: string, role: Role, assignedClass: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  addAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'readBy'>) => Promise<boolean>;
  updateAnnouncement: (id: string, data: Partial<Omit<Announcement, 'id'>>) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<void>;
  markAnnouncementsAsRead: (announcementIds: string[]) => Promise<void>;
  getAuditLogs: (options: {
    limit: number,
    offset?: number,
  }) => Promise<{ logs: AuditLog[], hasMore: boolean }>;
  deleteAuditLogs: (logIds: string[]) => Promise<void>;
  exportData: (options: { format: 'csv' | 'pdf', dateRange: { from: string, to: string }, classNames: string[] }) => Promise<void>;
  dismissBackupPrompt: () => void;
  checkBackupNow: () => void;
  archiveRegistrationsByMonth: (year: number, month: number) => Promise<void>;
  getArchivedRegistrations: (options: {
    dateRange: {from: string, to: string},
    classNames?: string[],
    getAll?: boolean
  }) => Promise<{registrations: MealRegistration[]}>;
  getRegisteredClasses: (date: string) => Promise<string[]>;
}


const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_CLASSES: Omit<ClassInfo, 'id'>[] = [
    { name: 'Mầm', studentCount: 20 },
    { name: 'Chồi', studentCount: 25 },
    { name: 'Lá', studentCount: 30 },
];

const sortClasses = (classes: ClassInfo[]): ClassInfo[] => {
    const order: Record<string, number> = {
        'Nhà trẻ': 1, 'Bé': 2, 'Nhỡ': 3, 'Lớn': 4
    };

    return [...classes].sort((a, b) => {
        const aMatch = a.name.match(/^(\D+)\s*(\d*)$/);
        const bMatch = b.name.match(/^(\D+)\s*(\d*)$/);

        const aName = aMatch ? aMatch[1].trim() : a.name;
        const aNum = aMatch && aMatch[2] ? parseInt(aMatch[2], 10) : 0;
        const bName = bMatch ? bMatch[1].trim() : b.name;
        const bNum = bMatch && bMatch[2] ? parseInt(bMatch[2], 10) : 0;
        
        const orderA = order[aName] || 99;
        const orderB = order[bName] || 99;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return aNum - bNum;
    });
};

const toIso = (value: any): string | undefined => {
    if (!value) return undefined;
    return new Date(value).toISOString();
};

const mapClassRow = (row: any): ClassInfo => ({
    id: String(row.id),
    name: row.name,
    studentCount: row.student_count,
    updatedAt: toIso(row.updated_at),
});

const mapUserRow = (row: any): User => ({
    id: row.id,
    email: row.email || '',
    displayName: row.display_name,
    role: row.role,
    assignedClass: row.assigned_class || undefined,
});

const mapRegistrationRow = (row: any): MealRegistration => ({
    id: row.id,
    className: row.class_name,
    date: row.date,
    mealType: row.meal_type,
    count: row.count,
    updatedAt: toIso(row.updated_at),
    registeredBy: row.registered_by || undefined,
    registeredById: row.registered_by_id || undefined,
});

const mapAnnouncementRow = (row: any): Announcement => ({
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: toIso(row.created_at) || '',
    createdBy: row.created_by || '',
    createdById: row.created_by_id || '',
    readBy: row.read_by || [],
});

const mapAuditLogRow = (row: any): AuditLog => ({
    id: row.id,
    timestamp: toIso(row.timestamp) || '',
    userId: row.user_id || '',
    userName: row.user_name || '',
    action: row.action,
    details: row.details || {},
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast, setIsLoading } = useUI();

  const [editingInfo, setEditingInfo] = useState<{ className: string; date: string } | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [recentlyUpdatedKeys, setRecentlyUpdatedKeys] = useState<Set<string>>(new Set());
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  
  // Local state for announcement read status, acting as a client-side cache
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());
  // Announcements are loaded in batches (newest first) to keep initial load light.
  const ANNOUNCEMENTS_PAGE_SIZE = 20;
  const announcementsLimitRef = useRef(ANNOUNCEMENTS_PAGE_SIZE);
  const [announcementsTotal, setAnnouncementsTotal] = useState(0);

  // Load read statuses from localStorage when user logs in
  useEffect(() => {
    if (currentUser) {
        try {
            const item = localStorage.getItem(`readAnnouncements_${currentUser.id}`);
            setLocallyReadIds(item ? new Set(JSON.parse(item)) : new Set());
        } catch {
            setLocallyReadIds(new Set());
        }
    } else {
        setLocallyReadIds(new Set());
    }
  }, [currentUser]);

  // Highlight updated keys for a short time after any registration change
  const markRecentlyUpdated = useCallback((keys: string[]) => {
    setRecentlyUpdatedKeys(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.add(k));
        next.forEach(k => {
            window.setTimeout(() => {
                setRecentlyUpdatedKeys(cur => {
                    const n = new Set(cur);
                    n.delete(k);
                    return n;
                });
            }, 4000);
        });
        return next;
    });
  }, []);

  const triggerRefetch = () => setDataVersion(v => v + 1);

   const logAction = useCallback(async (action: AuditLogAction, details: Record<string, any>) => {
    if (!currentUser) return;
    try {
        await supabase.from('audit_logs').insert({
            action,
            details,
            user_id: currentUser.id,
            user_name: currentUser.displayName,
        });
    } catch (error) {
        console.error("Failed to write to audit log:", error);
    }
  }, [currentUser]);

  // ---- Client-side permission guards (server enforces the real rules via RLS) ----
  const isAdmin = currentUser?.role === Role.Admin;
  const isBGH = currentUser?.role === Role.BGH;
  // Only Admin/BGH load the full user list (RLS restricts profiles reads accordingly).
  const canReadUsers = isAdmin || isBGH;

  const canWriteRegistrations = (className?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === Role.Admin || currentUser.role === Role.KT_CD) return true;
    if (currentUser.role === Role.GV) return !className || currentUser.assignedClass === className;
    return false;
  };

  const canWriteClass = (): boolean => isAdmin;
  const canWriteUser = (): boolean => isAdmin;
  const canWriteAnnouncement = (): boolean => isAdmin || isBGH;
  const canArchive = (): boolean => isAdmin;
  
  const checkForBackupPrompt = useCallback(() => {
    if (currentUser?.role !== Role.Admin) return;
    
    try {
        const settingsStr = localStorage.getItem('backupSettings_v1');
        const settings = settingsStr ? JSON.parse(settingsStr) : { day: '1', hour: '8' };
        const reminderDay = settings.day;
        const reminderHour = parseInt(settings.hour, 10);

        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dismissedKey = `backupPromptDismissed_${currentYearMonth}`;

        if (localStorage.getItem(dismissedKey)) {
            setShowBackupPrompt(false);
            return;
        }
        
        const isTargetDay = reminderDay === 'last' 
            ? now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
            : now.getDate() === parseInt(reminderDay, 10);

        if (isTargetDay && now.getHours() >= reminderHour) {
            setShowBackupPrompt(true);
        } else {
            setShowBackupPrompt(false);
        }

    } catch (e) {
        console.error("Could not check for backup prompt:", e);
    }
  }, [currentUser]);

  useEffect(() => {
     checkForBackupPrompt();
  }, [currentUser, checkForBackupPrompt]);

  const dismissBackupPrompt = useCallback(() => {
    try {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const dismissedKey = `backupPromptDismissed_${currentYearMonth}`;
        localStorage.setItem(dismissedKey, 'true');
        setShowBackupPrompt(false);
    } catch(e) {
        console.error("Could not dismiss backup prompt:", e);
    }
  }, []);
  
    const isAnnouncementRead = useCallback((ann: Announcement): boolean => {
        if (!currentUser) return true;
        return ann.readBy.includes(currentUser.id) || locallyReadIds.has(ann.id);
    }, [currentUser, locallyReadIds]);

  const unreadAnnouncementsCount = useMemo(() => {
    if (!currentUser) return 0;
    return announcements.filter(a => !isAnnouncementRead(a)).length;
  }, [announcements, currentUser, isAnnouncementRead]);

  // Seed default classes when table is empty
  const seedDefaultClasses = useCallback(async () => {
    const { count, error } = await supabase
        .from('classes')
        .select('id', { count: 'exact', head: true });
    if (error) throw error;
    if (count === 0) {
        await supabase.from('classes').insert(DEFAULT_CLASSES.map(c => ({ name: c.name, student_count: c.studentCount })));
    }
  }, []);

  const refetchClasses = useCallback(async (): Promise<void> => {
    const { data } = await supabase.from('classes').select('*');
    const rows = (data || []).map(mapClassRow);
    if (rows.length === 0) {
        try { await seedDefaultClasses(); } catch (e) { console.error(e); }
    }
    setClasses(sortClasses(rows));
  }, [seedDefaultClasses]);

  const refetchUsers = useCallback(async (): Promise<void> => {
    if (!canReadUsers) { setUsers([]); return; }
    const { data } = await supabase.from('profiles').select('*');
    setUsers((data || []).map(mapUserRow));
  }, [canReadUsers]);

  const refetchAnnouncements = useCallback(async (): Promise<void> => {
    const limit = announcementsLimitRef.current;
    const { data, count } = await supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);
    setAnnouncements((data || []).map(mapAnnouncementRow));
    setAnnouncementsTotal(count || 0);
  }, []);

  const loadMoreAnnouncements = useCallback(() => {
    announcementsLimitRef.current += ANNOUNCEMENTS_PAGE_SIZE;
    refetchAnnouncements();
  }, [refetchAnnouncements]);

  const hasMoreAnnouncements = announcementsTotal > announcements.length;

  const debounced = (fn: () => Promise<void>) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = undefined; fn(); }, 400);
    };
  };

  // Realtime subscriptions for classes, users, announcements
  useEffect(() => {
    if (!currentUser) {
        setClasses([]);
        setUsers([]);
        setAnnouncements([]);
        setAnnouncementsTotal(0);
        return;
    }
    setIsLoading(true);

    const channels: RealtimeChannel[] = [];

    const fetchAll = async () => {
        try {
            const classQuery = supabase.from('classes').select('*');
            const userQuery = canReadUsers
                ? supabase.from('profiles').select('*')
                : Promise.resolve({ data: null });
            const annQuery = supabase
                .from('announcements')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(ANNOUNCEMENTS_PAGE_SIZE);

            const [{ data: classRows }, { data: userRows }, { data: annRows, count }] = await Promise.all([
                classQuery, userQuery, annQuery,
            ]);

            let classList = (classRows || []).map(mapClassRow);
            if (classList.length === 0) {
                await seedDefaultClasses();
                const { data: re } = await supabase.from('classes').select('*');
                classList = (re || []).map(mapClassRow);
            }
            setClasses(sortClasses(classList));
            setUsers((userRows || []).map(mapUserRow));
            setAnnouncements((annRows || []).map(mapAnnouncementRow));
            setAnnouncementsTotal(count || 0);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            addToast("Không thể tải dữ liệu.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    fetchAll();

    const onClassesChange = debounced(refetchClasses);
    const onUsersChange = debounced(refetchUsers);
    const onAnnouncementsChange = debounced(refetchAnnouncements);

    const classChannel = supabase
        .channel('classes-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => { onClassesChange(); })
        .subscribe();
    channels.push(classChannel);

    if (canReadUsers) {
        const userChannel = supabase
            .channel('users-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { onUsersChange(); })
            .subscribe();
        channels.push(userChannel);
    }

    const announcementChannel = supabase
        .channel('announcements-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { onAnnouncementsChange(); })
        .subscribe();
    channels.push(announcementChannel);

    return () => {
        channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentUser, addToast, setIsLoading, seedDefaultClasses, canReadUsers, refetchClasses, refetchUsers, refetchAnnouncements]);

  const addRegistrations = useCallback(async (newRegistrations: Omit<MealRegistration, 'id' | 'updatedAt'>[]) => {
    if (!currentUser) {
        addToast("Lỗi: Không tìm thấy thông tin người dùng.", "error");
        return;
    }
    if (!newRegistrations.every(r => canWriteRegistrations(r.className))) {
        addToast("Bạn chỉ được đăng ký suất ăn cho lớp được phân công.", "error");
        return;
    }
    try {
      const userInfo = {
          registered_by_id: currentUser.id,
          registered_by: currentUser.displayName
      };

      const toUpsert = newRegistrations
          .filter(r => r.count > 0)
          .map(r => ({ class_name: r.className, date: r.date, meal_type: r.mealType, count: r.count, ...userInfo }));
      const toDelete = newRegistrations.filter(r => r.count <= 0);

      if (toUpsert.length > 0) {
        const { error } = await supabase.from('registrations').upsert(
          toUpsert,
          { onConflict: 'class_name,date,meal_type' }
        );
        if (error) throw error;
      }

      for (const del of toDelete) {
        const { error } = await supabase.from('registrations')
          .delete()
          .eq('class_name', del.className)
          .eq('date', del.date)
          .eq('meal_type', del.mealType);
        if (error) throw error;
      }

      await logAction('CREATE_REGISTRATION', { registrations: newRegistrations.filter(r => r.count > 0) });
      markRecentlyUpdated(newRegistrations.map(r => `${r.date}-${r.className}`));
      triggerRefetch();
      addToast(`Đã lưu đăng ký ${newRegistrations.length} mục.`, 'success');
    } catch (error) {
      console.error("Failed to save registrations", error);
      addToast("Lỗi khi lưu đăng ký.", "error");
    }
  }, [addToast, currentUser, logAction, markRecentlyUpdated, triggerRefetch]);

  const updateRegistrations = useCallback(async (updates: Omit<MealRegistration, 'id' | 'updatedAt'>[], originals: MealRegistration[]) => {
    if (!currentUser) {
        addToast("Lỗi: Không tìm thấy thông tin người dùng.", "error");
        return;
    }
    if (!updates.every(u => canWriteRegistrations(u.className))) {
        addToast("Bạn chỉ được chỉnh sửa suất ăn cho lớp được phân công.", "error");
        return;
    }
    try {
        const changes: any[] = [];

        // STALE_DATA check
        if (originals.length > 0) {
            for (const original of originals) {
                const { data } = await supabase
                    .from('registrations')
                    .select('updated_at')
                    .eq('id', original.id)
                    .maybeSingle();
                if (!data) continue;
                const serverTime = new Date(data.updated_at).toISOString();
                const clientTime = original.updatedAt ? new Date(original.updatedAt).toISOString() : null;
                if (clientTime && serverTime !== clientTime) {
                    throw new Error("STALE_DATA");
                }
            }
        }

        const originalsMap = new Map(originals.map(o => [`${o.date}-${o.mealType}`, o]));
        const updatesMap = new Map(updates.map(u => [`${u.date}-${u.mealType}`, u]));
        const allKeys = new Set([...originals.map(o => `${o.date}-${o.mealType}`), ...updates.map(u => `${u.date}-${u.mealType}`)]);
        const currentUserInfo = { registered_by_id: currentUser.id, registered_by: currentUser.displayName };

        const keysToHighlight: string[] = [];
        const updateRows: { id: string; count: number; registered_by_id: string; registered_by: string }[] = [];
        const upsertRows: { class_name: string; date: string; meal_type: string; count: number; registered_by_id: string; registered_by: string }[] = [];
        const deleteIds: string[] = [];

        for (const key of allKeys) {
            const original = originalsMap.get(key);
            const update = updatesMap.get(key);
            
            const originalCount = original?.count ?? 0;
            const newCount = update?.count ?? 0;

            if (original) {
                if (newCount > 0) {
                    if (newCount !== originalCount) {
                        changes.push({ mealType: original.mealType, oldValue: originalCount, newValue: newCount });
                        updateRows.push({ id: original.id, count: newCount, ...currentUserInfo });
                        keysToHighlight.push(`${original.date}-${original.className}`);
                    }
                } else {
                    changes.push({ mealType: original.mealType, oldValue: originalCount, newValue: 0 });
                    deleteIds.push(original.id);
                    keysToHighlight.push(`${original.date}-${original.className}`);
                }
            } else if (update && newCount > 0) {
                changes.push({ mealType: update.mealType, oldValue: 0, newValue: newCount });
                upsertRows.push({ class_name: update.className, date: update.date, meal_type: update.mealType, count: newCount, ...currentUserInfo });
                keysToHighlight.push(`${update.date}-${update.className}`);
            }
        }

        if (updateRows.length > 0) {
            const { error } = await supabase.from('registrations').upsert(updateRows, { onConflict: 'id' });
            if (error) throw error;
        }
        if (upsertRows.length > 0) {
            const { error } = await supabase.from('registrations').upsert(upsertRows, { onConflict: 'class_name,date,meal_type' });
            if (error) throw error;
        }
        if (deleteIds.length > 0) {
            const { error } = await supabase.from('registrations').delete().in('id', deleteIds);
            if (error) throw error;
        }

        if (changes.length > 0) {
            await logAction('UPDATE_REGISTRATION', { className: updates[0]?.className, date: updates[0]?.date, changes });
        }
        markRecentlyUpdated(keysToHighlight);
        triggerRefetch();
    } catch (error: any) {
        if (error?.message === 'STALE_DATA') {
            addToast('Dữ liệu đã bị thay đổi bởi người khác. Thông tin bạn đang chỉnh sửa vẫn được giữ lại — hãy bấm Lưu lại.', 'error');
            throw error;
        } else {
            console.error("Failed to update registrations", error);
            addToast("Lỗi khi cập nhật đăng ký.", "error");
        }
    }
  }, [addToast, currentUser, logAction, markRecentlyUpdated, triggerRefetch, canWriteRegistrations]);

  const getRegistrations = useCallback(async (options: {
    dates?: string[],
    classNames?: string[],
    dateRange?: { from: string, to: string },
    limit?: number,
    offset?: number,
    getAll?: boolean,
    skipCount?: boolean
  }): Promise<{
    registrations: MealRegistration[],
    totalCount: number,
    hasMore: boolean
  }> => {
    const { dates, classNames, dateRange, limit: queryLimit, offset = 0, getAll = false, skipCount = false } = options;

    let effectiveClassNames = classNames;
    if (currentUser?.role === Role.GV) {
        // Teachers only ever see (and can write) their own class.
        effectiveClassNames = currentUser.assignedClass ? [currentUser.assignedClass] : [];
        if (effectiveClassNames.length === 0) {
            return { registrations: [], totalCount: 0, hasMore: false };
        }
    }

    let query = supabase.from('registrations').select('*', { count: 'exact' });

    if (dateRange && dateRange.from) query = query.gte('date', dateRange.from);
    if (dateRange && dateRange.to) query = query.lte('date', dateRange.to);
    if (effectiveClassNames && effectiveClassNames.length > 0) query = query.in('class_name', effectiveClassNames);
    if (dates && dates.length > 0) query = query.in('date', dates);

    query = query.order('date', { ascending: false });

    if (!getAll && queryLimit) {
        query = query.range(offset, offset + queryLimit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
        console.error("getRegistrations error:", error);
        return { registrations: [], totalCount: 0, hasMore: false };
    }

    const registrations = (data || []).map(mapRegistrationRow);
    const totalCount = skipCount ? 0 : (count || 0);
    const hasMore = !getAll && queryLimit ? offset + registrations.length < (count || 0) : false;

    return { registrations, totalCount, hasMore };
  }, [currentUser]);

  const getRegisteredClasses = useCallback(async (date: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase.rpc('get_registered_classes', { p_date: date });
      if (error) {
        console.error("getRegisteredClasses error:", error);
        return [];
      }
      return (data || []).map((row: any) => row.class_name);
    } catch (error) {
      console.error("getRegisteredClasses exception:", error);
      return [];
    }
  }, []);
  
  const exportData = useCallback(async (options: { format: 'csv' | 'pdf', dateRange: { from: string, to: string }, classNames: string[] }) => {
        const { format, dateRange, classNames } = options;
        addToast('Đang chuẩn bị file... Quá trình này có thể mất vài giây.', 'success');

        interface ExportableRow {
            date: string;
            className: string;
            meals: { [key in MealType]?: { count: number; registeredBy?: string; } };
        }

        try {
            const { registrations: allRegistrations } = await getRegistrations({
                dateRange: (dateRange.from && dateRange.to) ? dateRange : undefined,
                classNames: classNames.length > 0 ? classNames : undefined,
                getAll: true
            });

            const dataByDateAndClass = allRegistrations.reduce((acc: Record<string, ExportableRow>, reg) => {
                const key = `${reg.date}-${reg.className}`;
                if (!acc[key]) {
                    acc[key] = { date: reg.date, className: reg.className, meals: {} };
                }
                acc[key].meals[reg.mealType] = {
                    count: reg.count,
                    registeredBy: reg.registeredBy
                };
                return acc;
            }, {} as Record<string, ExportableRow>);
            
            const exportableData = Object.values(dataByDateAndClass).sort((a: ExportableRow, b: ExportableRow) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className));
            
            const totals = exportableData.reduce((acc, item: ExportableRow) => {
                acc[MealType.KidsBreakfast] = (acc[MealType.KidsBreakfast] || 0) + (item.meals[MealType.KidsBreakfast]?.count || 0);
                acc[MealType.KidsLunch] = (acc[MealType.KidsLunch] || 0) + (item.meals[MealType.KidsLunch]?.count || 0);
                acc[MealType.TeachersLunch] = (acc[MealType.TeachersLunch] || 0) + (item.meals[MealType.TeachersLunch]?.count || 0);
                return acc;
            }, {
                [MealType.KidsBreakfast]: 0,
                [MealType.KidsLunch]: 0,
                [MealType.TeachersLunch]: 0,
            } as Record<MealType, number>);

            if (format === 'csv') {
                const separator = ';';
                const headers = ["Lớp", "Ngày", MealType.KidsBreakfast, "Người ĐK", MealType.KidsLunch, "Người ĐK", MealType.TeachersLunch, "Người ĐK", "Tổng cộng"];
                let csvContent = "\uFEFF" + headers.map(h => `"${h}"`).join(separator) + '\r\n';

                exportableData.forEach((item: ExportableRow) => {
                    const rowTotal = Object.values(item.meals).reduce((sum, meal) => sum + (meal?.count || 0), 0);
                    const row = [
                        item.className, new Date(item.date + 'T00:00:00').toLocaleDateString('vi-VN'),
                        item.meals[MealType.KidsBreakfast]?.count || 0, item.meals[MealType.KidsBreakfast]?.registeredBy || '',
                        item.meals[MealType.KidsLunch]?.count || 0, item.meals[MealType.KidsLunch]?.registeredBy || '',
                        item.meals[MealType.TeachersLunch]?.count || 0, item.meals[MealType.TeachersLunch]?.registeredBy || '',
                        rowTotal
                    ].map(val => `"${val}"`);
                    csvContent += row.join(separator) + '\r\n';
                });
                const totalRow = ["Tổng cộng", "", totals[MealType.KidsBreakfast], "", totals[MealType.KidsLunch], "", totals[MealType.TeachersLunch], "", Object.values(totals).reduce((s, c) => s + c, 0)].map(v => `"${v}"`);
                csvContent += totalRow.join(separator) + '\r\n';
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `Bao_cao_suat_an_tu_${dateRange.from}_den_${dateRange.to}.csv`);
                link.click();
                link.remove();
            } else { // PDF
                const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                  import('jspdf'),
                  import('jspdf-autotable')
                ]);
                
                const doc = new jsPDF();
                doc.addFont('/fonts/Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.setFont('Roboto');

                const head = [['Lớp', 'Ngày', MealType.KidsBreakfast, MealType.KidsLunch, MealType.TeachersLunch]];
                const body = exportableData.map((item: ExportableRow) => {
                    const kbc = `${item.meals[MealType.KidsBreakfast]?.count || 0} (${item.meals[MealType.KidsBreakfast]?.registeredBy || 'N/A'})`;
                    const klc = `${item.meals[MealType.KidsLunch]?.count || 0} (${item.meals[MealType.KidsLunch]?.registeredBy || 'N/A'})`;
                    const tlc = `${item.meals[MealType.TeachersLunch]?.count || 0} (${item.meals[MealType.TeachersLunch]?.registeredBy || 'N/A'})`;
                    return [item.className, new Date(item.date + 'T00:00:00').toLocaleDateString('vi-VN'), kbc, klc, tlc];
                });
                const foot = [['Tổng cộng', '', totals[MealType.KidsBreakfast], totals[MealType.KidsLunch], totals[MealType.TeachersLunch]]];

                doc.setFontSize(18);
                doc.text('Báo cáo tổng hợp suất ăn', 14, 22);
                doc.setFontSize(11);
                const fromDate = dateRange.from ? new Date(dateRange.from + 'T00:00:00').toLocaleDateString('vi-VN') : 'đầu';
                const toDate = dateRange.to ? new Date(dateRange.to + 'T00:00:00').toLocaleDateString('vi-VN') : 'cuối';
                doc.text(`Từ ngày ${fromDate} đến ngày ${toDate}`, 14, 30);
                
                autoTable(doc, { startY: 35, head, body, foot, theme: 'grid', headStyles: { fillColor: [22, 163, 74], font: 'Roboto' }, footStyles: { fillColor: [243, 244, 246], textColor: [0,0,0], font: 'Roboto' }, styles: { font: 'Roboto', fontStyle: 'normal' }});
                doc.save(`Bao_cao_suat_an_tu_${dateRange.from || 'all'}_den_${dateRange.to || 'all'}.pdf`);
            }
        } catch(e) {
            console.error("Export failed", e);
            addToast("Xuất file thất bại. Vui lòng thử lại.", 'error');
        }
  }, [getRegistrations, addToast]);

  const requestEdit = useCallback((className: string, date: string) => {
    setEditingInfo({ className, date });
  }, []);

  const clearEditing = useCallback(() => {
    setEditingInfo(null);
  }, []);

  const deleteRegistrations = useCallback(async (className: string, date: string) => {
    if (!canWriteRegistrations(className)) {
        addToast("Bạn không có quyền xóa đăng ký này.", "error");
        return;
    }
    try {
        const { error } = await supabase.from('registrations')
            .delete()
            .eq('class_name', className)
            .eq('date', date);
        if (error) throw error;
        await logAction('DELETE_REGISTRATION', { className, date });
        addToast(`Đã xóa đăng ký của lớp ${className} ngày ${new Date(date + 'T00:00:00').toLocaleDateString('vi-VN')}.`, 'success');
        triggerRefetch();
    } catch (error) {
        console.error("Failed to delete registrations", error);
        addToast("Lỗi khi xóa đăng ký.", "error");
    }
  }, [addToast, logAction, canWriteRegistrations, triggerRefetch]);

  const deleteMultipleRegistrationsByDate = useCallback(async (items: {className: string, date: string}[]) => {
    if (items.length === 0) return;
    if (!items.every(i => canWriteRegistrations(i.className))) {
        addToast("Bạn không có quyền xóa đăng ký của các lớp này.", "error");
        return;
    }
    try {
        for (const item of items) {
            await supabase.from('registrations')
                .delete()
                .eq('class_name', item.className)
                .eq('date', item.date);
        }
        await logAction('DELETE_REGISTRATION', { items });
        addToast(`Đã xóa thành công ${items.length} mục.`, 'success');
        triggerRefetch();
    } catch (error) {
        console.error("Failed to delete multiple registrations", error);
        addToast(`Lỗi khi xóa hàng loạt.`, 'error');
    }
  }, [addToast, logAction, canWriteRegistrations, triggerRefetch]);

  const addClass = useCallback(async (newClassData: Omit<ClassInfo, 'id' | 'updatedAt'>): Promise<boolean> => {
    if (!canWriteClass()) { addToast("Bạn không có quyền thêm lớp.", "error"); return false; }
    const trimmedName = newClassData.name.trim();
    if (classes.some(c => c.name.toLowerCase() === trimmedName.toLowerCase()) || !trimmedName) {
        addToast(`Lớp "${trimmedName}" đã tồn tại hoặc tên lớp không hợp lệ.`, 'error');
        return false;
    }
    try {
        const { error } = await supabase.from('classes').insert({ name: trimmedName, student_count: newClassData.studentCount });
        if (error) throw error;
        await logAction('CREATE_CLASS', { name: trimmedName, studentCount: newClassData.studentCount });
        addToast(`Đã thêm lớp "${trimmedName}".`, 'success');
        return true;
    } catch (error) {
        console.error("Failed to add class", error);
        addToast("Lỗi khi thêm lớp.", "error");
        return false;
    }
  }, [classes, addToast, logAction, triggerRefetch]);

  const updateClass = useCallback(async (classId: string, updatedData: Omit<ClassInfo, 'id' | 'updatedAt'>): Promise<boolean> => {
     if (!canWriteClass()) { addToast("Bạn không có quyền chỉnh sửa lớp.", "error"); return false; }
     const trimmedName = updatedData.name.trim();
     const oldClass = classes.find(c => c.id === classId);
     if (!trimmedName || (classes.some(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== classId))) {
        addToast(`Tên lớp "${trimmedName}" đã tồn tại hoặc không hợp lệ.`, 'error');
        return false;
    }
    try {
        await supabase.from('classes').update({ name: trimmedName, student_count: updatedData.studentCount }).eq('id', classId);

        if (oldClass && oldClass.name !== trimmedName) {
            await supabase.from('registrations').update({ class_name: trimmedName }).eq('class_name', oldClass.name);
        }
        await logAction('UPDATE_CLASS', { classId, oldName: oldClass?.name, newName: trimmedName, newStudentCount: updatedData.studentCount });
        addToast(`Đã cập nhật lớp "${oldClass?.name}".`, 'success');
        triggerRefetch();
        return true;
    } catch (error) {
        console.error("Failed to update class", error);
        addToast("Lỗi khi cập nhật lớp.", "error");
        return false;
    }
  }, [classes, addToast, logAction, canWriteClass, triggerRefetch]);

  const deleteClass = useCallback(async (classToDelete: ClassInfo) => {
    if (!canWriteClass()) { addToast("Bạn không có quyền xóa lớp.", "error"); return; }
    try {
        await supabase.from('registrations').delete().eq('class_name', classToDelete.name);
        await supabase.from('classes').delete().eq('id', classToDelete.id);
        await logAction('DELETE_CLASS', { id: classToDelete.id, name: classToDelete.name });
        addToast(`Đã xóa lớp "${classToDelete.name}" và các đăng ký liên quan.`, 'success');
        triggerRefetch();
    } catch (error: any) {
        console.error("Failed to delete class", error);
        addToast("Lỗi khi xóa lớp.", "error");
        throw error;
    }
  }, [addToast, logAction, canWriteClass, triggerRefetch]);

    const updateUser = useCallback(async (userId: string, updatedData: Partial<Omit<User, 'id'>>): Promise<boolean> => {
        if (!canWriteUser()) { addToast("Bạn không có quyền chỉnh sửa người dùng.", "error"); return false; }
        if (updatedData.email && users.some(u => u.email.toLowerCase() === updatedData.email!.toLowerCase() && u.id !== userId)) {
            addToast(`Email "${updatedData.email}" đã tồn tại.`, 'error'); return false;
        }
        try {
            const payload: Record<string, any> = {};
            if (updatedData.displayName !== undefined) payload.display_name = updatedData.displayName;
            if (updatedData.role !== undefined) payload.role = updatedData.role;
            if (updatedData.assignedClass !== undefined) payload.assigned_class = updatedData.assignedClass || null;

            await supabase.from('profiles').update(payload).eq('id', userId);
            await logAction('UPDATE_USER', { userId, ...updatedData });
            addToast(`Đã cập nhật thông tin người dùng.`, 'success');
            triggerRefetch();
            return true;
        } catch (error) {
            console.error("Failed to update user", error); addToast("Lỗi khi cập nhật người dùng.", "error"); return false;
        }
    }, [users, addToast, logAction, canWriteUser, triggerRefetch]);

    const isMissingRpc = (error: any): boolean => {
        const msg = String(error?.message || '').toLowerCase();
        return msg.includes('pgrst202') || msg.includes('does not exist') || msg.includes('could not find the function');
    };

    const deleteUser = useCallback(async (userId: string) => {
        if (!canWriteUser()) { addToast("Bạn không có quyền xóa người dùng.", "error"); return; }
        const userToDelete = users.find(u => u.id === userId);
        try {
            // Attempt full removal via RPC; only if the RPC is not deployed yet
            // do we fall back to removing just the profile.
            const { error } = await supabase.rpc('delete_user', { p_user_id: userId });
            if (error) {
                if (!isMissingRpc(error)) {
                    throw error;
                }
                await supabase.from('profiles').delete().eq('id', userId);
            }
            await logAction('DELETE_USER', { userId, email: userToDelete?.email });
            addToast(`Đã xóa người dùng.`, 'success');
            triggerRefetch();
        } catch (error) {
            console.error("Failed to delete user", error); addToast("Lỗi khi xóa người dùng.", "error");
        } 
    }, [users, addToast, logAction, canWriteUser, triggerRefetch]);

    const approveUser = useCallback(async (userId: string, role: Role, assignedClass: string): Promise<boolean> => {
        if (!canWriteUser()) { addToast("Bạn không có quyền duyệt tài khoản.", "error"); return false; }
        const user = users.find(u => u.id === userId);
        try {
            const payload: Record<string, any> = {
                role,
                assigned_class: role === Role.GV ? (assignedClass || null) : null,
            };
            const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
            if (error) throw error;
            await logAction('UPDATE_USER', { userId, email: user?.email, role, assignedClass });
            addToast(`Đã duyệt tài khoản "${user?.displayName || userId}".`, 'success');
            triggerRefetch();
            return true;
        } catch (error) {
            console.error("Failed to approve user", error);
            addToast("Lỗi khi duyệt tài khoản.", "error");
            return false;
        }
    }, [addToast, logAction, users, canWriteUser, triggerRefetch]);

    const rejectUser = useCallback(async (userId: string): Promise<boolean> => {
        if (!canWriteUser()) { addToast("Bạn không có quyền từ chối tài khoản.", "error"); return false; }
        const user = users.find(u => u.id === userId);
        try {
            const { error } = await supabase.rpc('delete_user', { p_user_id: userId });
            if (error) {
                if (!isMissingRpc(error)) {
                    throw error;
                }
                await supabase.from('profiles').delete().eq('id', userId);
            }
            await logAction('DELETE_USER', { userId, email: user?.email, reason: 'REJECTED' });
            addToast(`Đã từ chối tài khoản "${user?.displayName || userId}".`, 'success');
            triggerRefetch();
            return true;
        } catch (error) {
            console.error("Failed to reject user", error);
            addToast("Lỗi khi từ chối tài khoản.", "error");
            return false;
        }
    }, [addToast, logAction, users, canWriteUser, triggerRefetch]);
    
    const refreshUsers = useCallback(async () => {
        try {
            const { data } = await supabase.from('profiles').select('*');
            setUsers((data || []).map(mapUserRow));
        } catch (error) {
            console.error("Failed to refresh users", error);
        }
    }, []);
    
    const addAnnouncement = useCallback(async (data: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdById' | 'readBy'>) => {
        if (!canWriteAnnouncement()) { addToast("Bạn không có quyền đăng thông báo.", "error"); return false; }
        if (!currentUser) return false;
        try {
            const { error } = await supabase.from('announcements').insert({
                title: data.title,
                content: data.content,
                created_by: currentUser.displayName,
                created_by_id: currentUser.id,
                read_by: [currentUser.id]
            });
            if (error) throw error;
            await logAction('CREATE_ANNOUNCEMENT', { title: data.title });
            addToast('Đã đăng thông báo mới.', 'success');
            return true;
        } catch (error) {
            console.error("Failed to add announcement:", error); addToast('Lỗi khi đăng thông báo.', 'error'); return false;
        }
    }, [currentUser, addToast, logAction, canWriteAnnouncement, triggerRefetch]);

    const updateAnnouncement = useCallback(async (id: string, data: Partial<Omit<Announcement, 'id'>>) => {
        if (!canWriteAnnouncement()) { addToast("Bạn không có quyền sửa thông báo.", "error"); return false; }
        try {
            const payload: Record<string, any> = {};
            if (data.title !== undefined) payload.title = data.title;
            if (data.content !== undefined) payload.content = data.content;
            await supabase.from('announcements').update(payload).eq('id', id);
            await logAction('UPDATE_ANNOUNCEMENT', { announcementId: id, newTitle: data.title });
            addToast('Đã cập nhật thông báo.', 'success');
            return true;
        } catch(error) {
            console.error("Failed to update announcement:", error); addToast('Lỗi khi cập nhật.', 'error'); return false;
        }
    }, [addToast, logAction, canWriteAnnouncement, triggerRefetch]);

    const deleteAnnouncement = useCallback(async (id: string) => {
        if (!canWriteAnnouncement()) { addToast("Bạn không có quyền xóa thông báo.", "error"); return; }
        try {
            await supabase.from('announcements').delete().eq('id', id);
            await logAction('DELETE_ANNOUNCEMENT', { announcementId: id });
            addToast('Đã xóa thông báo.', 'success');
        } catch (error) {
            console.error("Failed to delete announcement:", error); addToast('Lỗi khi xóa.', 'error');
        }
    }, [addToast, logAction, canWriteAnnouncement, triggerRefetch]);

    const markAnnouncementsAsRead = useCallback(async (announcementIds: string[]) => {
        if (!currentUser || announcementIds.length === 0) return;
        setLocallyReadIds(prevIds => {
            const newIds = new Set(prevIds);
            announcementIds.forEach(id => newIds.add(id));
            try {
                localStorage.setItem(`readAnnouncements_${currentUser.id}`, JSON.stringify(Array.from(newIds)));
            } catch (e) {
                console.error("Failed to save read announcements to localStorage", e);
            }
            return newIds;
        });

        try {
            for (const id of announcementIds) {
                const { data } = await supabase.from('announcements').select('read_by').eq('id', id).maybeSingle();
                const current = Array.isArray(data?.read_by) ? data.read_by : [];
                if (!current.includes(currentUser.id)) {
                    const next = [...current, currentUser.id];
                    await supabase.from('announcements').update({ read_by: next }).eq('id', id);
                }
            }
        } catch (error) {
            console.warn("Failed to mark announcements as read on server:", error);
        }
    }, [currentUser]);
    
    const getAuditLogs = useCallback(async (options: {
        limit: number,
        offset?: number,
    }): Promise<{ logs: AuditLog[], hasMore: boolean }> => {
        const { limit: queryLimit, offset = 0 } = options;
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .range(offset, offset + queryLimit - 1);

        if (error) {
            console.error("getAuditLogs error:", error);
            return { logs: [], hasMore: false };
        }

        const logs = (data || []).map(mapAuditLogRow);
        return { logs, hasMore: logs.length === queryLimit };
    }, []);

    const deleteAuditLogs = useCallback(async (logIds: string[]) => {
        if (logIds.length === 0) return;
        if (!canWriteUser()) { addToast("Bạn không có quyền xóa lịch sử.", "error"); return; }
        try {
            await supabase.from('audit_logs').delete().in('id', logIds);
            addToast(`Đã xóa ${logIds.length} mục lịch sử.`, 'success');
        } catch (error) {
            console.error("Failed to delete audit logs", error);
            addToast("Lỗi khi xóa lịch sử.", "error");
        }
    }, [addToast, canWriteUser, triggerRefetch]);

    const archiveRegistrationsByMonth = useCallback(async (year: number, month: number) => {
        if (!canArchive()) { addToast("Bạn không có quyền lưu trữ dữ liệu.", "error"); return; }
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0);
            const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            const { count, error: countError } = await supabase
                .from('registrations')
                .select('id', { count: 'exact', head: true })
                .gte('date', startDate)
                .lte('date', endDateStr);
            if (countError) throw countError;

            if ((count || 0) === 0) {
                addToast(`Không có dữ liệu nào trong tháng ${month}/${year} để lưu trữ.`, 'success');
                return;
            }

            const { data: archiveData, error: rpcError } = await supabase.rpc('archive_registrations', { p_start: startDate, p_end: endDateStr });
            if (rpcError) throw rpcError;

            await logAction('ARCHIVE_DATA', { year, month, count: archiveData ?? count });
            addToast(`Đã lưu trữ thành công ${archiveData ?? count} mục từ tháng ${month}/${year}.`, 'success');
            triggerRefetch();
        } catch (error) {
            console.error("Failed to archive data", error);
            addToast("Lỗi khi lưu trữ dữ liệu.", "error");
        }
    }, [addToast, logAction, canArchive, triggerRefetch]);

    const getArchivedRegistrations = useCallback(async (options: {
        dateRange: { from: string, to: string },
        classNames?: string[],
        getAll?: boolean
    }): Promise<{registrations: MealRegistration[]}> => {
        const { dateRange, classNames } = options;
        let adjustedClassNames = classNames;
        if (currentUser?.role === Role.GV) {
            adjustedClassNames = currentUser.assignedClass ? [currentUser.assignedClass] : [];
            if (adjustedClassNames.length === 0) return { registrations: [] };
        }
        let query = supabase.from('archived_registrations').select('*');
        if (dateRange && dateRange.from) query = query.gte('date', dateRange.from);
        if (dateRange && dateRange.to) query = query.lte('date', dateRange.to);
        if (adjustedClassNames && adjustedClassNames.length > 0) query = query.in('class_name', adjustedClassNames);

        const { data, error } = await query;
        if (error) {
            console.error("getArchivedRegistrations error:", error);
            return { registrations: [] };
        }
        const registrations = (data || []).map(mapRegistrationRow);
        return { registrations };
    }, [currentUser]);
    
  const value = useMemo(() => ({
    editingInfo, classes, users, announcements, unreadAnnouncementsCount, hasMoreAnnouncements, loadMoreAnnouncements, dataVersion, recentlyUpdatedKeys, showBackupPrompt, isAnnouncementRead,
    addRegistrations, updateRegistrations, requestEdit, clearEditing, deleteRegistrations, deleteMultipleRegistrationsByDate, addClass, updateClass, deleteClass, getRegistrations, updateUser, deleteUser, approveUser, rejectUser, refreshUsers, addAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementsAsRead, getAuditLogs, deleteAuditLogs, exportData, dismissBackupPrompt, checkBackupNow: checkForBackupPrompt, archiveRegistrationsByMonth, getArchivedRegistrations, getRegisteredClasses
  }), [editingInfo, classes, users, announcements, unreadAnnouncementsCount, hasMoreAnnouncements, loadMoreAnnouncements, dataVersion, recentlyUpdatedKeys, showBackupPrompt, isAnnouncementRead, addRegistrations, updateRegistrations, requestEdit, clearEditing, deleteRegistrations, deleteMultipleRegistrationsByDate, addClass, updateClass, deleteClass, getRegistrations, updateUser, deleteUser, approveUser, rejectUser, refreshUsers, addAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementsAsRead, getAuditLogs, deleteAuditLogs, exportData, dismissBackupPrompt, checkForBackupPrompt, archiveRegistrationsByMonth, getArchivedRegistrations, getRegisteredClasses]);

  return (
    <DataContext.Provider value={value}>
        {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
