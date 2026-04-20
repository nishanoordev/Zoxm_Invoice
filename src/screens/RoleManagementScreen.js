import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, LayoutAnimation, Platform, UIManager, Alert, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';


export default function RoleManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { 
    teamMembers, 
    businessInviteCode, 
    currentRole, 
    fetchTeam, 
    updateMemberRole, 
    removeMember,
    refreshBusinessInviteCode 
  } = useStore();

  const [expandedRole, setExpandedRole] = useState('Staff');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const isAdmin = currentRole === 'admin';

  const roles = [
    {
      name: 'Staff',
      id: 'staff',
      icon: 'business-center',
      description: 'Can create invoices, process basic transactions, and view their own sales history. Staff cannot generate advanced reports or view system settings.',
    },
    {
      name: 'Manager',
      id: 'manager',
      icon: 'engineering',
      description: 'Full access to inventory, customers, and all invoices. Can generate financial reports but cannot modify core business details or delete team members.',
    },
    {
      name: 'Owner',
      id: 'admin',
      icon: 'security',
      description: 'Complete administrative access to all features, settings, and team management. Can manage all roles and export system data.',
    }
  ];

  const toggleExpand = (role) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRole(expandedRole === role ? null : role);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join my team on ZOXM Invoice! Use this invite code to connect to our business: ${businessInviteCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefreshCode = () => {
    Alert.alert(
      'Refresh Invite Code',
      'This will invalidate the old code. Future staff will need the new code to join. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', style: 'destructive', onPress: refreshBusinessInviteCode }
      ]
    );
  };

  const handleMemberAction = (member) => {
    if (!isAdmin) return;
    if (member.role === 'admin') return;

    Alert.alert(
      'Manage Team Member',
      `What would you like to do with ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: member.role === 'manager' ? 'Demote to Staff' : 'Promote to Manager', 
          onPress: () => updateMemberRole(member.uid, member.role === 'manager' ? 'staff' : 'manager') 
        },
        { 
          text: 'Remove from Team', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert(
              'Confirm Removal',
              `Are you sure you want to remove ${member.name}? they will lose all access to this business.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeMember(member.uid) }
              ]
            );
          }
        }
      ]
    );
  };

  const RoleItem = ({ role }) => (
    <View className="mb-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
      <TouchableOpacity 
        onPress={() => toggleExpand(role.name)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 items-center justify-center">
            <MaterialIcons name={role.icon} size={22} className="text-[#2D2D5F] dark:text-blue-400" />
          </View>
          <Text className="text-slate-900 dark:text-slate-100 font-bold text-base">{role.name}</Text>
        </View>
        <MaterialIcons 
          name={expandedRole === role.name ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={24} 
          className="text-slate-400" 
        />
      </TouchableOpacity>
      {expandedRole === role.name && (
        <View className="px-4 pb-4">
          <Text className="text-slate-500 dark:text-slate-400 text-sm leading-5">
            {role.description}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-10 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} className="text-slate-900 dark:text-slate-100" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Role Management</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          {/* Invite Code Section (Owner Only) */}
          {isAdmin && (
            <View className="mb-8 p-6 bg-[#2D2D5F] rounded-[32px] shadow-xl overflow-hidden relative">
              <View className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <View className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
              
              <Text className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Business Invite Code</Text>
              <View className="flex-row items-center justify-between">
                <Text style={{ fontSize: 32 }} className="text-white font-black tracking-widest">
                  {businessInviteCode || '------'}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity 
                    onPress={handleRefreshCode}
                    className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                  >
                    <MaterialIcons name="refresh" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleShareInvite}
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  >
                    <MaterialIcons name="share" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
              <View className="mt-4 pt-4 border-t border-white/10">
                <Text className="text-white/70 text-[11px] leading-4">
                  Share this code with your team members. They can enter it during sign-up to join your business instantly.
                </Text>
              </View>
            </View>
          )}

          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Role Permissions</Text>
          {roles.map(role => <RoleItem key={role.name} role={role} />)}

          <View className="flex-row items-center justify-between mt-8 mb-4">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Team Members</Text>
            <View className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-full">
              <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">{teamMembers.length} Total</Text>
            </View>
          </View>

          {teamMembers.length === 0 ? (
            <View className="py-10 items-center justify-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800">
              <MaterialIcons name="group" size={48} className="text-slate-200 dark:text-slate-800 mb-2" />
              <Text className="text-slate-400 font-medium">No team members yet</Text>
            </View>
          ) : (
            teamMembers.map((user, index) => (
              <TouchableOpacity 
                key={user.uid || index}
                onPress={() => handleMemberAction(user)}
                className="flex-row items-center gap-4 mb-4 bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800"
              >
                <View className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                  <MaterialIcons name="person" size={28} className="text-slate-300 dark:text-slate-600" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{user.name}</Text>
                  <Text className="text-slate-400 text-xs font-medium">{user.email}</Text>
                </View>
                <View className={`px-3 py-1 rounded-lg ${
                  user.role === 'admin' ? 'bg-indigo-100' : 
                  user.role === 'manager' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin' ? 'text-indigo-600' : 
                    user.role === 'manager' ? 'text-blue-600' : 'text-slate-600'
                  }`}>
                    {user.role}
                  </Text>
                </View>
                {isAdmin && user.role !== 'admin' && (
                  <MaterialIcons name="more-vert" size={20} className="text-slate-300" />
                )}
              </TouchableOpacity>
            ))
          )}

          {isAdmin && (
            <TouchableOpacity 
              onPress={handleShareInvite}
              className="mt-6 w-full h-16 rounded-[28px] border-2 border-dashed border-slate-200 dark:border-slate-800 items-center justify-center flex-row gap-2"
            >
              <MaterialIcons name="add-circle" size={20} className="text-slate-400" />
              <Text className="text-slate-500 dark:text-slate-400 font-bold">Invite New Member</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

