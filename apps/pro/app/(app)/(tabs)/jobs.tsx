import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiCallError } from '../../../src/api/client';
import { useMyJobs, type JobsSegment, type ProJob } from '../../../src/api/me';
import { Avatar } from '../../../src/components/Avatar';
import { formatRupees } from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';

const SEGMENTS: Array<{ key: JobsSegment; label: string }> = [
  { key: 'pending', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
];

export default function JobsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<JobsSegment>('pending');
  const jobs = useMyJobs(segment);

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />

      <View className="bg-brand-800" style={{ paddingBottom: 16 }}>
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(212,162,76,0.16)',
          }}
        />
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-2">
            <Text
              className="text-[10px] font-bold uppercase tracking-[2px]"
              style={{ color: colors.accent[200] }}
            >
              Your work
            </Text>
            <Text className="mt-1 text-[26px] font-bold text-ink-inverse">Jobs</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Segmented control on the boundary */}
      <View className="-mt-3 px-5">
        <View
          className="flex-row rounded-card bg-surface p-1"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          {SEGMENTS.map((s) => {
            const active = s.key === segment;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSegment(s.key)}
                className={`flex-1 items-center rounded-[12px] py-2.5 ${active ? 'bg-brand' : ''}`}
              >
                <Text
                  className={`text-[12px] font-bold ${
                    active ? 'text-ink-inverse' : 'text-ink-muted'
                  }`}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={jobs.isFetching}
            onRefresh={() => void jobs.refetch()}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        {jobs.isPending ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : jobs.isError ? (
          <View className="mx-5 rounded-card border border-danger/30 bg-danger/5 p-4">
            <Text className="text-sm text-danger">Couldn&apos;t load jobs.</Text>
            <Pressable onPress={() => void jobs.refetch()} className="mt-2 self-start">
              <Text className="text-sm font-bold text-brand">Try again</Text>
            </Pressable>
          </View>
        ) : jobs.data?.jobs.length === 0 ? (
          <EmptyState segment={segment} />
        ) : (
          <View className="px-5">
            {jobs.data?.jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                segment={segment}
                onOpen={() => router.push({ pathname: '/(app)/job/[id]', params: { id: job.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EmptyState({ segment }: { segment: JobsSegment }) {
  const copy = {
    pending: {
      icon: 'briefcase-outline' as const,
      title: 'No new jobs',
      sub: 'Toggle yourself online to start\nreceiving match requests.',
    },
    active: {
      icon: 'time-outline' as const,
      title: 'No active jobs',
      sub: "Accepted jobs will appear here\nuntil they're completed.",
    },
    history: {
      icon: 'archive-outline' as const,
      title: 'No past jobs yet',
      sub: 'Completed and cancelled jobs\nwill be shown here.',
    },
  }[segment];
  return (
    <View className="items-center px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-50">
        <Ionicons name={copy.icon} size={28} color={colors.brand.DEFAULT} />
      </View>
      <Text className="mt-4 text-[16px] font-bold text-ink">{copy.title}</Text>
      <Text className="mt-1 text-center text-[13px] text-ink-muted">{copy.sub}</Text>
    </View>
  );
}

function JobCard({
  job,
  segment,
  onOpen,
}: {
  job: ProJob;
  segment: JobsSegment;
  onOpen: () => void;
}) {
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string; status: string }>(`/bookings/${job.id}/accept`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
      void qc.invalidateQueries({ queryKey: ['pro.me.today'] });
    },
    onError: (e) => {
      Alert.alert("Can't accept", e instanceof ApiCallError ? e.message : 'Try again.');
    },
  });
  const reject = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string; status: string }>(`/bookings/${job.id}/cancel`, {
        method: 'POST',
        body: { reason: 'Pro declined the match' },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
    },
    onError: (e) => {
      Alert.alert("Can't decline", e instanceof ApiCallError ? e.message : 'Try again.');
    },
  });

  const scheduled = new Date(job.scheduledAt);
  const timeStr = scheduled.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dateStr = scheduled.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <Pressable
      onPress={onOpen}
      className="mb-3 rounded-card bg-surface p-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-ink-subtle">
            #{job.bookingNumber}
          </Text>
          <Text className="mt-0.5 text-[15px] font-bold text-ink">{job.category.name}</Text>
        </View>
        <StatusPill status={job.status} />
      </View>

      <View className="mt-3 flex-row items-center">
        <Avatar
          fullName={job.customer.fullName}
          photoUrl={job.customer.profilePhoto ?? undefined}
          size={36}
        />
        <View className="ml-2 flex-1">
          <Text numberOfLines={1} className="text-[12px] font-semibold text-ink">
            {job.customer.fullName}
          </Text>
          {job.addressArea ? (
            <Text className="text-[11px] text-ink-subtle">{job.addressArea}</Text>
          ) : null}
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between rounded-card bg-surface-muted px-3 py-2.5">
        <View className="flex-row items-center">
          <Ionicons name="calendar" size={12} color={colors.brand.DEFAULT} />
          <Text className="ml-1 text-[12px] font-bold text-ink">{dateStr}</Text>
          <Text className="mx-1 text-[11px] text-ink-subtle">·</Text>
          <Text className="text-[12px] font-semibold text-ink-muted">{timeStr}</Text>
        </View>
        <Text className="text-[13px] font-bold text-brand">{formatRupees(job.totalAmount)}</Text>
      </View>

      {segment === 'pending' ? (
        <View className="mt-3 flex-row">
          <Pressable
            onPress={() => reject.mutate()}
            disabled={reject.isPending || accept.isPending}
            className="mr-2 flex-1 items-center rounded-card border border-border bg-surface py-3"
          >
            {reject.isPending ? (
              <ActivityIndicator color={colors.ink.muted} size="small" />
            ) : (
              <Text className="text-[13px] font-bold text-ink-muted">Decline</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => accept.mutate()}
            disabled={accept.isPending || reject.isPending}
            style={{
              shadowColor: colors.brand.DEFAULT,
              shadowOpacity: 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            className="ml-2 flex-1 items-center rounded-card bg-brand py-3"
          >
            {accept.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-[13px] font-bold text-ink-inverse">Accept</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

function StatusPill({ status }: { status: ProJob['status'] }) {
  const ui = {
    matched: { label: 'New', bg: 'bg-accent/15', text: 'text-accent-600' as const },
    confirmed: { label: 'Confirmed', bg: 'bg-brand-100', text: 'text-brand' as const },
    pro_en_route: {
      label: 'En route',
      bg: 'bg-brand-100',
      text: 'text-brand' as const,
    },
    otp_verified: { label: 'Arrived', bg: 'bg-success/10', text: 'text-success' as const },
    in_progress: {
      label: 'In progress',
      bg: 'bg-success/10',
      text: 'text-success' as const,
    },
    completed: { label: 'Completed', bg: 'bg-success/10', text: 'text-success' as const },
    cancelled_customer: {
      label: 'Cancelled',
      bg: 'bg-danger/10',
      text: 'text-danger' as const,
    },
    cancelled_pro: {
      label: 'Declined',
      bg: 'bg-danger/10',
      text: 'text-danger' as const,
    },
    disputed: { label: 'Disputed', bg: 'bg-warning/10', text: 'text-warning' as const },
  }[status];
  return (
    <View className={`rounded-pill ${ui.bg} px-2.5 py-1`}>
      <Text className={`text-[10px] font-bold ${ui.text}`}>{ui.label}</Text>
    </View>
  );
}
