const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'src', 'screens', 'movements', 'AddMovementScreen.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startLine = 915 - 1; // 0-indexed
// Find the end of the return statement. It ends with ');' on its own line after the footer.
let endLine = -1;
for (let i = startLine; i < lines.length; i++) {
  if (lines[i].trim() === '</SafeAreaView>' && lines[i+1] && lines[i+1].trim() === ');') {
    endLine = i + 1;
    break;
  }
}

if (endLine === -1) {
    // Try another way: find the last occurrence of ');' before '};' (end of component)
    const lastSemi = lines.slice(900).reverse().findIndex(l => l.trim() === ');');
    if (lastSemi !== -1) {
        endLine = lines.length - 1 - lastSemi;
    }
}

console.log(`Replacing from line ${startLine + 1} to ${endLine + 1}`);

const newReturn = `  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16 }}>
      
      {/* QUICK ACTIONS TOP */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#f2f2f0', borderRadius: 100, padding: 4 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: type === 'expense' ? '#c05050' : 'transparent' }}
            onPress={() => setType('expense')}
            disabled={!!ticketId}
          >
            <Ionicons name="remove-circle" size={16} color={type === 'expense' ? '#fff' : '#878778'} />
            <Text style={{ marginLeft: 4, color: type === 'expense' ? '#fff' : '#878778', fontSize: 13, fontFamily: FontFamily.regular }}>Pago</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: type === 'income' ? '#3a9e76' : 'transparent' }}
            onPress={() => setType('income')}
            disabled={!!ticketId}
          >
            <Ionicons name="add-circle" size={16} color={type === 'income' ? '#fff' : '#878778'} />
            <Text style={{ marginLeft: 4, color: type === 'income' ? '#fff' : '#878778', fontSize: 13, fontFamily: FontFamily.regular }}>Cobro</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={{ position: 'absolute', right: 16 }} onPress={() => navigation.goBack()}>
          <View style={{ backgroundColor: '#f2f2f0', borderRadius: 100, padding: 8 }}>
            <Ionicons name="close" size={20} color="#363630" />
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          {/* CONTENT BASED ON ACTIVE TAB */}
          {activeTab === 'info' && (
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
              {/* BIG AMOUNT */}
              <View style={{ alignItems: 'center' }}>
                <TextInput
                   style={{ fontSize: 40, fontFamily: FontFamily.medium, color: type === 'income' ? '#3a9e76' : '#c05050', textAlign: 'center', width: '100%' }}
                   placeholder="$0"
                   placeholderTextColor={type === 'income' ? '#3a9e7680' : '#c0505080'}
                   keyboardType="numeric"
                   value={amount ? '$' + amount : ''}
                   onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                   autoFocus={!ticketId}
                   editable={canEditAsOwner && (!ticketId || status === 'pending')}
                />
                
                <TextInput
                   style={{ fontSize: 15, fontFamily: FontFamily.regular, color: '#878778', textAlign: 'center', marginTop: 8 }}
                   placeholder="Agregar un comentario"
                   placeholderTextColor="#878778"
                   value={description}
                   onChangeText={setDescription}
                   editable={canEditAsOwner && status !== 'cancelled' && status !== 'completed'}
                />
                
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                   <TouchableOpacity 
                     style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 }} 
                     onPress={() => setDateOptionsModalVisible(true)} 
                     disabled={!canEditAsOwner || status === 'cancelled' || status === 'completed'}
                   >
                     <Text style={{ fontSize: 15, color: '#878778' }}>
                       {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                     </Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#e7e7e4', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 }} 
                     disabled={!canEditAsOwner || status === 'cancelled' || status === 'completed'} 
                     onPress={() => {
                       if (Platform.OS === 'ios') {
                         setShowDatePicker(true);
                       } else {
                         setDateOptionsModalVisible(true);
                       }
                     }}
                   >
                     <Text style={{ fontSize: 15, color: '#878778' }}>
                       {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                     </Text>
                   </TouchableOpacity>
                </View>

                {/* Billetera / Categoría pills */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 42, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}>
                   <TouchableOpacity 
                     style={{ flex: 1, alignItems: 'flex-start' }} 
                     onPress={() => setWalletModalVisible(true)}
                     disabled={status === 'cancelled'}
                   >
                      <Text style={{ fontSize: 13, color: '#878778' }}>Billetera</Text>
                      <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', marginTop: 4 }} numberOfLines={1}>
                        {selectedWallet ? selectedWallet.name : 'Seleccionar'}
                      </Text>
                   </TouchableOpacity>
                   <View style={{ width: 1, height: 40, backgroundColor: '#f2f2f0', marginHorizontal: 16 }} />
                   <TouchableOpacity 
                     style={{ flex: 1, alignItems: 'flex-end' }} 
                     onPress={() => setRubroModalVisible(true)}
                     disabled={status === 'cancelled'}
                   >
                      <Text style={{ fontSize: 13, color: '#878778' }}>Categoría</Text>
                      <Text style={{ fontSize: 17, fontFamily: FontFamily.semibold, color: '#363630', marginTop: 4 }} numberOfLines={1}>
                        {selectedRubro ? selectedRubro.label : 'Seleccionar'}
                      </Text>
                   </TouchableOpacity>
                </View>

                {/* Other details in info tab */}
                <View style={{ width: '100%', marginTop: 16 }}>
                  {!ticketId && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}
                      onPress={handlePickContact}
                      disabled={!isOwner}
                    >
                      <Text style={{ fontSize: 15, color: '#363630' }}>Destinatario</Text>
                      <Text style={{ fontSize: 15, color: '#878778' }}>
                        {assignedListName || (assignedContacts.length > 0 ? assignedContacts[0].name : 'Elegir')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={{ fontSize: 15, color: '#363630', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}
                    placeholder="Instrucciones de pago"
                    placeholderTextColor="#878778"
                    value={paymentProcedure}
                    onChangeText={setPaymentProcedure}
                    editable={canEditAsOwner && (!ticketId || status === 'pending')}
                  />
                  {type === 'income' && (
                    <TextInput
                      style={{ fontSize: 15, color: '#363630', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f0' }}
                      placeholder="Gastos asociados"
                      placeholderTextColor="#878778"
                      keyboardType="numeric"
                      value={expenses}
                      onChangeText={(text) => setExpenses(text.replace(/[^0-9.]/g, ''))}
                      editable={canEditAsOwner && (!ticketId || status === 'pending')}
                    />
                  )}
                </View>

                {/* Status indicator (if not edit) or Actions (if edit) */}
                {!!ticketId && status === 'pending' && (
                  <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#f2f2f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => {
                        setPayAmount((Number(amount) - Number(amountPaid)).toString());
                        setIsPaymentModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#363630', fontSize: 15, fontFamily: FontFamily.semibold }}>
                        {isOwner ? (isIncome ? 'Registrar cobro' : 'Registrar pago') : (isIncome ? 'Registrar pago' : 'Registrar cobro')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ paddingVertical: 8, alignItems: 'center' }}
                      onPress={handleCancelTicket}
                    >
                      <Text style={{ color: '#c05050', fontSize: 14 }}>Cancelar ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'attach' && (
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
              <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 24 }}>Adjuntos</Text>
              {!attachmentUri ? (
                <View style={{ gap: 16 }}>
                  <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }} onPress={handlePickImage}>
                    <Ionicons name="image-outline" size={24} color="#363630" />
                    <Text style={{ fontSize: 16, color: '#363630' }}>Galería de imágenes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }} onPress={handleTakePhoto}>
                    <Ionicons name="camera-outline" size={24} color="#363630" />
                    <Text style={{ fontSize: 16, color: '#363630' }}>Cámara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }} onPress={handlePickDocument}>
                    <Ionicons name="document-attach-outline" size={24} color="#363630" />
                    <Text style={{ fontSize: 16, color: '#363630' }}>Documento PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 60, height: 60, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {(attachmentUri.toLowerCase().match(/\\.(jpg|jpeg|png|webp|gif)$/) || attachmentUri.startsWith('data:image') || attachmentUri.startsWith('blob:') || attachmentUri.startsWith('file:')) ? (
                      <Image source={{ uri: attachmentUri }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Ionicons name="document-text-outline" size={32} color="#878778" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: '#363630', fontWeight: 'bold' }} numberOfLines={1}>{attachmentUri.split('/').pop()}</Text>
                    <Text style={{ fontSize: 12, color: '#878778' }}>Archivo adjunto</Text>
                  </View>
                  <TouchableOpacity onPress={removeAttachment}>
                    <Ionicons name="trash-outline" size={20} color="#c05050" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'recurring' && (
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
              <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630', marginBottom: 24 }}>Recurrencia</Text>
              <View style={{ backgroundColor: '#f2f2f0', borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Ionicons name="time-outline" size={48} color="#878778" />
                <Text style={{ fontSize: 16, color: '#363630', textAlign: 'center', marginTop: 16, fontFamily: FontFamily.medium }}>
                  Configura este ticket para que se repita automáticamente.
                </Text>
                <TouchableOpacity style={{ marginTop: 24, backgroundColor: '#363630', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontFamily: FontFamily.semibold }}>Activar recurrencia</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* TOOLBAR */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 16, backgroundColor: '#fff' }}>
        <TouchableOpacity style={{ backgroundColor: activeTab === 'info' ? '#363630' : '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setActiveTab('info')}>
          <Ionicons name="pricetag-outline" size={20} color={activeTab === 'info' ? '#fff' : '#363630'} />
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: activeTab === 'attach' ? '#363630' : '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setActiveTab('attach')}>
          <Ionicons name="attach-outline" size={20} color={activeTab === 'attach' ? '#fff' : (attachmentUri ? "#3a9e76" : "#363630")} />
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: activeTab === 'recurring' ? '#363630' : '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setActiveTab('recurring')}>
          <Ionicons name="repeat-outline" size={20} color={activeTab === 'recurring' ? '#fff' : "#363630"} />
        </TouchableOpacity>
        {!!ticketId && (
          <>
            <TouchableOpacity style={{ backgroundColor: isLogModalVisible ? '#363630' : '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setIsLogModalVisible(true)}>
              <Ionicons name="list-outline" size={20} color={isLogModalVisible ? '#fff' : "#363630"} />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f2f2f0', borderRadius: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => (navigation as any).navigate('ChatDetail', { ticketId })}>
              <Ionicons name="chatbubble-outline" size={20} color="#363630" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* FOOTER SAVE BUTTON */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f2f2f0' }}>
        {!!(!isOwner && ticketId) && (
          <View style={{ marginBottom: 12, padding: 10, backgroundColor: '#FEFCE8', borderRadius: 10, borderWidth: 1, borderColor: '#FEF08A' }}>
            <Text style={{ fontSize: 12, color: '#854D0E', textAlign: 'center', fontFamily: FontFamily.medium }}>
              Como invitado puedes editar y gestionar este ticket de forma compartida.
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={{ backgroundColor: '#207e52', borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: (isSaving || !amount || !selectedWalletId) ? 0.6 : 1 }} 
          onPress={handleSave} 
          disabled={isSaving || !amount || !selectedWalletId}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontFamily: FontFamily.bold }}>
            {isSaving ? "Guardando..." : (ticketId ? "Guardar cambios" : "Guardar ticket")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LOG MODAL */}
      <Modal visible={isLogModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontFamily: FontFamily.bold, color: '#363630' }}>Historial del Ticket</Text>
              <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                <Ionicons name="close" size={24} color="#363630" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={logs}
              keyExtractor={(item) => item.logId}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
                   <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f2f2f0', alignItems: 'center', justifyContent: 'center' }}>
                     <Ionicons name={item.action === 'payment_received' ? "cash-outline" : "document-text-outline"} size={20} color="#363630" />
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={{ fontSize: 16, fontFamily: FontFamily.semibold, color: '#363630' }}>
                       {item.action === 'created' ? 'Creado' : item.action === 'payment_received' ? 'Pago parcial' : 'Cambio realizado'}
                     </Text>
                     <Text style={{ fontSize: 13, color: '#878778', marginTop: 2 }}>{item.newValue || item.comment || 'Detalle no especificado'}</Text>
                     <Text style={{ fontSize: 11, color: '#a3a3a3', marginTop: 4 }}>
                       {new Date(item.createdAt).toLocaleString('es-ES')} · Por {item.user?.displayName || item.userId}
                     </Text>
                   </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#878778', marginTop: 40 }}>No hay movimientos aún.</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );`;

lines.splice(startLine, endLine - startLine + 1, newReturn);

fs.writeFileSync(filePath, lines.join('\n'));
console.log("Successfully replaced the return block.");
