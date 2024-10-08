import React from 'react'
import { Tabs } from 'expo-router'
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';

const Layout = () => {
    const [loaded, error] = useFonts({
        'Outfit-Black-Regular': require('../../assets/Outfit-Regular.ttf'),
        'Outfit-Black-Medium': require('../../assets/Outfit-Medium.ttf'),
        'Outfit-Black-Bold': require('../../assets/Outfit-Bold.ttf'),
    });
    const iconSize = 25
    return (
        <Tabs screenOptions={{
            tabBarStyle: { backgroundColor: '#1f1f2d', borderWidth: 0, elevation: 0, shadowOpacity: 0 },
            tabBarActiveTintColor: '#FF8C00',
            tabBarLabelStyle: { fontSize: 12 },
            headerStyle: { backgroundColor: '#1f1f2d', height: Platform.OS === 'ios' ? 100 : 80 },
            headerTitleStyle: { color: 'rgba(255,255,255, 0.8)', fontStyle: 'Outfit-Black-Bold', fontSize: 26, fontWeight: 'bold', marginTop: 10 },
            headerTitleAlign: 'left',
        }} >
            <Tabs.Screen options={{
                title: 'Chats',
                tabBarIcon: ({ focused }) => (<Ionicons
                    name={focused ? `chatbubble-ellipses` : 'chatbubble-ellipses-outline'}
                    size={iconSize} color={focused ? '#FF8C00' : 'grey'} />),
                tabBarActiveTintColor: '#FF8C00',
            }} name='ChatsTab' />


            <Tabs.Screen options={{
                title: 'Add',
                tabBarIcon: ({ focused }) => (<Ionicons name={focused ? "person-add" : "person-add-outline"} size={iconSize} color={focused ? '#FF8C00' : 'grey'} />),
                tabBarActiveTintColor: '#FF8C00',

            }} name='SearchTab'
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('SearchModal');
                    },
                })}
            />

            <Tabs.Screen options={{
                title: 'Settings',
                tabBarIcon: ({ focused }) => (<Ionicons name={focused ? "settings-sharp" : "settings-outline"} size={iconSize} color={focused ? '#FF8C00' : 'grey'} />),
                tabBarActiveTintColor: '#FF8C00',
            }} name='ProfileTab' />
        </Tabs >
    )
}

export default Layout