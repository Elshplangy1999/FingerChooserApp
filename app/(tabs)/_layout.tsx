import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarStyle: { display: 'none' }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Finger Chooser',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="gamepad" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabBarIcon name="info-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}