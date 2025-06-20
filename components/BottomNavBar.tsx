// FILE: components/BottomNavBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Definisikan tipe untuk setiap item tab
type TabItemProps = {
  name: string;
  href: any;
  iconName: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  router: any;
};

// Komponen untuk satu tombol tab
const TabItem = ({ name, href, iconName, isActive, router }: TabItemProps) => (
  <TouchableOpacity style={styles.tabItem} onPress={() => router.replace(href)}>
    <Ionicons 
      name={isActive ? iconName : `${iconName}-outline` as any} 
      size={24} 
      color={isActive ? '#FF5A5F' : '#888'} 
    />
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{name}</Text>
  </TouchableOpacity>
);

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname(); // Hook untuk mendapatkan path saat ini

  return (
    // SafeAreaView untuk menghindari area bawah yang tidak aman (seperti home bar di iPhone)
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <TabItem
          name="Beranda"
          href="/"
          iconName="home"
          isActive={pathname === '/'}
          router={router}
        />
        <TabItem
          name="Tiket Saya"
          href="/profile"
          iconName="ticket"
          isActive={pathname === '/profile'}
          router={router}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#FF5A5F',
    fontWeight: '600',
  },
});
