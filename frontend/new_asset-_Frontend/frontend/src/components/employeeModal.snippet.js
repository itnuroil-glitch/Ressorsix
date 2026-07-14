      {isEmployeeModalOpen && (
        <Modal transparent={true} animationType="fade" visible={isEmployeeModalOpen}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: 500 }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingEmployee ? 'Edit User' : 'Create User'}</Text>
                <TouchableOpacity onPress={() => setIsEmployeeModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {employeeFormError ? (
                  <View style={styles.modalErrorContainer}>
                    <Text style={styles.modalErrorText}>{employeeFormError}</Text>
                  </View>
                ) : null}

                <Text style={styles.modalLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="John Smith"
                  value={empFullName}
                  onChangeText={setEmpFullName}
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.modalLabel}>Email</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="john.smith@email.com"
                  value={empEmail}
                  onChangeText={setEmpEmail}
                  keyboardType="email-address"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.modalLabel}>Phone</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="+1 123 456 7890"
                  value={empPhone}
                  onChangeText={setEmpPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>System Permissions Role</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={empRoleId}
                        onValueChange={(itemValue) => setEmpRoleId(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Role" value="" color={COLORS.textSecondary} />
                        {roles.map(r => (
                          <Picker.Item key={r.id} label={r.role} value={r.id} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={{ width: 16 }} />
                  <View style={{ width: 100 }}>
                    <Text style={[styles.modalLabel, { textAlign: 'center' }]}>Status</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                      <Switch
                        value={empStatus === 1}
                        onValueChange={(val) => setEmpStatus(val ? 1 : 0)}
                        trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                        thumbColor={COLORS.white}
                      />
                      <Text style={{ marginLeft: 8, fontSize: 13, color: empStatus === 1 ? '#10B981' : COLORS.textSecondary, fontWeight: '500' }}>
                        {empStatus === 1 ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.modalLabel}>Associated Companies</Text>
                {/* For simplicity we use a multi-select simulation or basic picker. Since standard picker is single select, we can use a custom multi-select UI. */}
                <View style={[styles.modalInput, { height: 'auto', minHeight: 44, paddingVertical: 8 }]}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {companies.map(c => (
                      <TouchableOpacity 
                        key={c.id} 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                        onPress={() => {
                          setEmpAssociatedCompanies(prev => 
                            prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                          );
                        }}
                      >
                        <Ionicons 
                          name={empAssociatedCompanies.includes(c.id) ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={empAssociatedCompanies.includes(c.id) ? COLORS.primary : COLORS.textSecondary} 
                        />
                        <Text style={{ marginLeft: 8, color: COLORS.textPrimary }}>{c.company_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.modalLabel}>Department</Text>
                <View style={[styles.pickerWrapper, { marginBottom: 16 }]}>
                  <Picker
                    selectedValue={empDepartmentId}
                    onValueChange={(itemValue) => setEmpDepartmentId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Department" value="" color={COLORS.textSecondary} />
                    {departments.map(d => (
                      <Picker.Item key={d.id} label={d.department_name} value={d.id} />
                    ))}
                  </Picker>
                </View>

                {!editingEmployee && (
                  <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>Security</Text>
                      </View>
                      <Switch
                        value={empAutoGeneratePassword}
                        onValueChange={setEmpAutoGeneratePassword}
                        trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                      Auto-generate temporary password
                    </Text>
                    {empAutoGeneratePassword && (
                      <Text style={{ fontSize: 12, color: COLORS.primary, marginTop: 8, fontStyle: 'italic' }}>
                        Temporary Password will be displayed upon creation.
                      </Text>
                    )}
                  </View>
                )}

              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setIsEmployeeModalOpen(false)}
                  disabled={employeeFormSaving}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit, employeeFormSaving && { opacity: 0.7 }]}
                  onPress={handleSaveEmployee}
                  disabled={employeeFormSaving}
                >
                  {employeeFormSaving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalBtnSubmitText}>{editingEmployee ? 'Save Changes' : 'Create User'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
