const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'src', 'screens', 'movements', 'AddMovementScreen.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find return ( after line 900
const startIndex = lines.findIndex((l, i) => i > 900 && l.trim() === 'return (');
// Find closing </ScrollView> and </View> (the footer) after startIndex
const endOfScrollViewIndex = lines.findIndex((l, i) => i > startIndex && l.includes('</ScrollView>'));
const endOfFooterIndex = lines.findIndex((l, i) => i > endOfScrollViewIndex && l.trim() === '</View>' && lines[i-1] && lines[i-1].includes('disabled={!amount || !selectedWalletId || isSaving}'));

if (startIndex === -1 || endOfFooterIndex === -1) {
  console.log("Could not find boundaries", {startIndex, endOfScrollViewIndex, endOfFooterIndex});
  process.exit(1);
}

const newUi = `
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16 }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* QUICK ACTIONS TOP */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#f2f2f0', borderRadius: 100, padding: 4 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: isIncome ? 'transparent' : '#c05050' }}
            onPress={() => setType('expense')}
            disabled={!!ticketId}
          >
            <Ionicons name="remove-circle" size={16} color={!isIncome ? '#fff' : '#878778'} />
            <Text style={{ marginLeft: 4, color: !isIncome ? '#fff' : '#878778', fontSize: 15, fontFamily: FontFamily.regular }}>Pago</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: isIncome ? '#3a9e76' : 'transparent' }}
            onPress={() => setType('income')}
            disabled={!!ticketId}
          >
            <Ionicons name="add-circle" size={16} color={isIncome ? '#fff' : '#878778'} />
            <Text style={{ marginLeft: 4, color: isIncome ? '#fff' : '#878778', fontSize: 15, fontFamily: FontFamily.regular }}>Cobro</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{ position: 'absolute', right: 16 }} onPress={() => navigation.goBack()}>
          <View style={{ backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 }}>
            <Ionicons name="close" size={20} color="#363630" />
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            {/* BIG AMOUNT */}
            <TextInput
               style={{ fontSize: 40, fontFamily: FontFamily.medium, color: isIncome ? '#3a9e76' : '#c05050', textAlign: 'center', minWidth: '100%' }}
               placeholder="$0"
               placeholderTextColor={isIncome ? '#3a9e7680' : '#c0505080'}
               keyboardType="numeric"
               value={amount ? '$' + amount : ''}
               onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
               autoFocus={!ticketId}
               editable={canEditAsOwner && (!ticketId || status === 'pending')}
            />
            
            {/* DESCRIPTION OVERRIDE TO LOOK LIKE A SIMPLE TEXT */}
            <TextInput
               style={{ fontSize: 15, fontFamily: FontFamily.regular, color: '#878778', textAlign: 'center', marginTop: 8 }}
               placeholder="Agregar un comentario"
               placeholderTextColor="#878778"
               value={description}
               onChangeText={setDescription}
               editable={canEditAsOwner && status !== 'cancelled' && status !== 'completed'}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
               <TouchableOpacity style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => setDateOptionsModalVisible(true)} disabled={!canEditAsOwner || status === 'cancelled' || status === 'completed'}>
                 <Text style={{ fontSize: 15, color: '#878778' }}>{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 }} disabled={!canEditAsOwner || status === 'cancelled' || status === 'completed'} onPress={() => setShowDatePicker(true)}>
                 <Text style={{ fontSize: 15, color: '#878778' }}>{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
               </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 42, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
               <TouchableOpacity style={{ flex: 1, alignItems: 'flex-start' }} onPress={() => (!ticketId || isParticipant || isOwner) ? setWalletModalVisible(true) : null} disabled={status === 'cancelled'}>
                  <Text style={{ fontSize: 13, color: '#878778' }}>Billetera</Text>
                  <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', marginTop: 4 }} numberOfLines={1}>{selectedWallet ? selectedWallet.name : 'Seleccionar'}</Text>
               </TouchableOpacity>
               <View style={{ width: 1, height: '100%', backgroundColor: '#f2f2f0', marginHorizontal: 16 }} />
               <TouchableOpacity style={{ flex: 1, alignItems: 'flex-end' }} onPress={() => (!ticketId || isParticipant || isOwner) ? setRubroModalVisible(true) : null} disabled={status === 'cancelled'}>
                  <Text style={{ fontSize: 13, color: '#878778' }}>Categoría</Text>
                  <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', marginTop: 4 }} numberOfLines={1}>{selectedRubro ? selectedRubro.label : 'Seleccionar'}</Text>
               </TouchableOpacity>
            </View>

            {/* ICONS TOOLBAR */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16, paddingVertical: 12 }}>
               <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setContactOptionsModalVisible(true)}>
                 <Ionicons name="pricetag-outline" size={20} color="#363630" />
               </TouchableOpacity>
               <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={handlePickDocument}>
                 <Ionicons name="attach-outline" size={20} color={attachmentUri ? "#207e52" : "#363630"} />
               </TouchableOpacity>
               <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => Alert.alert('Próximamente', 'Convertir a movimiento recurrente')}>
                 <Ionicons name="repeat-outline" size={20} color="#363630" />
               </TouchableOpacity>
               {!!ticketId && (
                 <>
                   <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setIsLogModalVisible(true)}>
                     <Ionicons name="list-outline" size={20} color="#363630" />
                   </TouchableOpacity>
                   <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => (navigation as any).navigate('ChatDetail', { ticketId })}>
                     <Ionicons name="chatbubble-outline" size={20} color="#363630" />
                   </TouchableOpacity>
                 </>
               )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <TouchableOpacity style={{ backgroundColor: '#207e52', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} onPress={handleSave} disabled={isSaving || !amount || !selectedWalletId}>
           <Text style={{ color: '#fff', fontSize: 20, fontFamily: FontFamily.medium }}>{isSaving ? "Guardando..." : "Guardar"}</Text>
        </TouchableOpacity>
      </View>
`;

lines.splice(startIndex + 1, endOfFooterIndex - startIndex, newUi);

fs.writeFileSync(filePath, lines.join('\n'));
console.log("Replaced UI successfully.");
