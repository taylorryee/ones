import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const player = {
  name: 'Taylor',
  rating: 1000,
  wins: 0,
  losses: 0,
  qrCode: 'player-qr-code-goes-here',
};

const qrPattern = [
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [0, 0, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 1, 0, 0, 1],
  [0, 1, 1, 0, 1, 0, 1, 1, 0],
  [1, 1, 1, 0, 0, 1, 1, 1, 1],
  [1, 0, 1, 1, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1],
];

export default function HomeScreen() {
  const totalMatches = player.wins + player.losses;
  const winRate = totalMatches === 0 ? '0%' : `${Math.round((player.wins / totalMatches) * 100)}%`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ONES PROFILE</Text>
          <Text style={styles.title}>Ready for your next match?</Text>
          <Text style={styles.subtitle}>
            Share your player code, challenge someone nearby, and keep your record moving.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={styles.rating}>Rating {player.rating}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{player.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{player.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{winRate}</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.sectionTitle}>Your QR Code</Text>
          <Text style={styles.sectionText}>Let another player scan this to challenge you.</Text>

          <View style={styles.qrCode}>
            {qrPattern.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.qrRow}>
                {row.map((cell, cellIndex) => (
                  <View
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={[styles.qrCell, cell === 1 && styles.qrCellFilled]}
                  />
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.qrValue}>{player.qrCode}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    gap: 20,
    padding: 20,
  },
  header: {
    gap: 8,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  rating: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  statValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionText: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  qrCode: {
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    gap: 4,
    marginTop: 4,
    padding: 14,
  },
  qrRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qrCell: {
    backgroundColor: '#FFFFFF',
    height: 14,
    width: 14,
  },
  qrCellFilled: {
    backgroundColor: '#111827',
  },
  qrValue: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
