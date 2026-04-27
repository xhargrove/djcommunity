import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";

import { parsePublicEnv } from "./src/lib/env";
import { getSupabaseClient } from "./src/lib/supabase";

export default function App() {
  const envResult = useMemo(() => parsePublicEnv(), []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!envResult.ok) {
      return;
    }

    const supabase = getSupabaseClient(envResult.data);

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [envResult]);

  if (!envResult.ok) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>MixerHQ</Text>
        <Text style={styles.errorTitle}>Supabase env missing</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.mono}>{envResult.message}</Text>
        </ScrollView>
        <Text style={styles.hint}>
          Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set the same URL and anon key as
          the web app (EXPO_PUBLIC_* names). Restart Expo.
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (session === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MixerHQ</Text>
      <Text style={styles.subtitle}>Supabase connected</Text>
      <Text style={styles.body}>
        {session?.user
          ? `Signed in as ${session.user.email ?? session.user.id}`
          : "Signed out (session will persist here after you add auth screens)."}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  scroll: {
    alignSelf: "stretch",
    maxHeight: 200,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#166534",
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    color: "#374151",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#b91c1c",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#111827",
  },
  hint: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
});
