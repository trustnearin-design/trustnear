import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotificationStatus,
  requestNotificationPermission,
  requestIgnoreBatteryOptimizations,
  openAppSettings,
  isGateDone,
  markGateDone,
} from '../lib/notifReadiness';
import { colors } from '../theme/colors';

/**
 * First-launch notification-readiness gate (Swiggy/Zomato rider style).
 * CRITICAL for the Pro app — a new-job alert must ring even when the app is
 * killed. Walks the pro through: allow notifications, allow background
 * (one-tap battery dialog), and the auto-start settings shortcut. Shows once.
 */
export function NotificationGate() {
  const [visible, setVisible] = useState(false);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bgTapped, setBgTapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [done, status] = await Promise.all([isGateDone(), getNotificationStatus()]);
      if (cancelled) return;
      setGranted(status === 'granted');
      if (!done) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAllowNotifications = async () => {
    setBusy(true);
    const status = await requestNotificationPermission();
    setGranted(status === 'granted');
    setBusy(false);
  };

  const onAllowBackground = async () => {
    setBgTapped(true);
    await requestIgnoreBatteryOptimizations();
  };

  const finish = () => {
    void markGateDone();
    setVisible(false);
  };

  if (!visible) return null;
  const isAndroid = Platform.OS === 'android';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={finish}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface.DEFAULT,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 22,
            paddingBottom: 34,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              height: 4,
              width: 44,
              borderRadius: 2,
              backgroundColor: colors.border.DEFAULT,
              marginBottom: 16,
            }}
          />

          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                height: 56,
                width: 56,
                borderRadius: 28,
                backgroundColor: colors.brand[50],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications" size={28} color={colors.brand[700]} />
            </View>
            <Text
              style={{
                marginTop: 12,
                fontSize: 20,
                fontWeight: '800',
                color: colors.ink.DEFAULT,
                textAlign: 'center',
              }}
            >
              Naye kaam ki alert miss na ho
            </Text>
            <Text
              style={{ marginTop: 6, fontSize: 13, color: colors.ink.muted, textAlign: 'center' }}
            >
              App band hone par bhi job alert bajni chahiye. 2 cheezein on karein — warna booking
              miss ho sakti hai.
            </Text>
          </View>

          <Step
            n={1}
            done={granted}
            title="Allow notifications"
            body="Naye jobs ki turant alert."
            cta={granted ? 'Allowed' : 'Allow'}
            disabled={granted || busy}
            loading={busy}
            onPress={() => void onAllowNotifications()}
          />

          {isAndroid ? (
            <Step
              n={2}
              done={bgTapped}
              title="Allow background activity"
              body="App band hone par bhi alert aaye — dialog mein 'Allow' dabayein."
              cta={bgTapped ? 'Opened' : 'Allow'}
              disabled={false}
              loading={false}
              onPress={() => void onAllowBackground()}
            />
          ) : null}

          {isAndroid ? (
            <Pressable
              onPress={() => void openAppSettings()}
              style={{ marginTop: 14, alignSelf: 'center' }}
            >
              <Text style={{ fontSize: 12, color: colors.brand[700], fontWeight: '700' }}>
                Realme/Oppo/Xiaomi? Auto-start on karne ke liye Settings kholein →
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={finish}
            style={{
              marginTop: 18,
              backgroundColor: colors.brand[700],
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Step({
  n,
  done,
  title,
  body,
  cta,
  disabled,
  loading,
  onPress,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  cta: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          height: 28,
          width: 28,
          borderRadius: 14,
          backgroundColor: done ? colors.success : colors.brand[700],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{n}</Text>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink.DEFAULT }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.ink.muted }}>{body}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: colors.brand[50],
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.brand[700]} />
        ) : (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: done ? colors.success : colors.brand[700],
            }}
          >
            {cta}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
