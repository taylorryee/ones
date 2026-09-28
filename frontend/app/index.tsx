import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getAuthToken } from '@/api';
import { getCurrentUser } from '@/services/auth';

export default function IndexScreen() {
  const [destination, setDestination] = useState<'/login' | '/profile' | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const token = await getAuthToken();
    if (!token) {
      setDestination('/login');
      return;
    }

    try {
      await getCurrentUser();
      setDestination('/profile');
    } catch {
      setDestination('/login');
    }
  }

  if (destination === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
});
