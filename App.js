import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, SafeAreaView, RefreshControl
} from 'react-native';

const API_KEY = 'yGlKh9z3TFeKg7zzBerzAQ==';

const FAVOURITE_STOPS = [
  { code: '50171', name: 'Zhong Shan Mall' },
  { code: '50179', name: 'Opp Zhongshan Mall' },
  { code: '52479', name: 'Opp EAIM' },
  { code: '52179', name: 'TPY Blk 106' },
];

const MY_BUSES = [
  { label: '208 to VIIO', busNo: '129', stopCode: '52179', stopName: 'TPY Blk 106' },
  { label: 'VIIO to 208', busNo: '129', stopCode: '52479', stopName: 'Opp EAIM' },
  { label: 'VIIO to TPY Bus Int', busNo: '139', stopCode: '52479', stopName: 'Opp EAIM' },
  { label: 'Opp ZSM to Novena MRT', busNo: '21', stopCode: '50171', stopName: 'Zhong Shan Mall' },
  { label: 'Opp ZSM to Novena MRT', busNo: '131', stopCode: '50171', stopName: 'Zhong Shan Mall' },
];

function getMinutes(isoStr) {
  if (!isoStr || isoStr === 'null' || isoStr === '0') return null;
  const diff = (new Date(isoStr) - new Date()) / 1000 / 60;
  return Math.round(diff);
}

function formatMin(min) {
  if (min === null || isNaN(min)) return null;
  if (min <= 1) return 'Arr';
  return `${min} min`;
}

async function fetchStop(code) {
  const res = await fetch(
    `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${code}`,
    { headers: { AccountKey: API_KEY, Accept: 'application/json' } }
  );
  const data = await res.json();
  return data.Services || [];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('stops');
  const [stops, setStops] = useState({});
  const [myBusData, setMyBusData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  async function loadAll() {
    try {
      const allCodes = [...new Set([
        ...FAVOURITE_STOPS.map(s => s.code),
        ...MY_BUSES.map(b => b.stopCode)
      ])];
      const results = await Promise.all(allCodes.map(code => fetchStop(code)));
      const mapped = {};
      allCodes.forEach((code, i) => { mapped[code] = results[i]; });
      setStops(mapped);
      setMyBusData(mapped);
      setLastUpdated(new Date().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSearch() {
    if (!searchCode) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults(null);
    try {
      const services = await fetchStop(searchCode);
      if (services.length === 0) setSearchError('No buses found for this stop.');
      else setSearchResults({ code: searchCode, services });
    } catch (e) {
      setSearchError('Could not fetch arrivals. Check your connection.');
    }
    setSearchLoading(false);
  }

  function ArrivalPills({ services, busNo }) {
    const svc = services.find(s => s.ServiceNo === busNo);
    if (!svc) return <Text style={styles.noData}>Not in service</Text>;
    const buses = [svc.NextBus, svc.NextBus2, svc.NextBus3];
    const arrivals = buses.map(b => b ? getMinutes(b.EstimatedArrival) : null).filter(m => m !== null && !isNaN(m));
    if (!arrivals.length) return <Text style={styles.noData}>No data</Text>;
    return (
      <View style={styles.arrivalRow}>
        {arrivals.map((min, i) => (
          <View key={i} style={[styles.pill, min <= 1 && styles.pillArriving]}>
            <Text style={[styles.pillTime, min <= 1 && styles.pillTimeArriving]}>{formatMin(min)}</Text>
            <Text style={styles.pillLabel}>{i === 0 ? 'next' : i === 1 ? '2nd' : '3rd'}</Text>
          </View>
        ))}
      </View>
    );
  }

  function StopsTab() {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />}
      >
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search any bus stop code"
            value={searchCode}
            onChangeText={setSearchCode}
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity style={styles.btn} onPress={handleSearch}>
            <Text style={styles.btnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {searchLoading && <ActivityIndicator size="small" color="#1a73e8" style={{ marginBottom: 16 }} />}
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
        {searchResults && (
          <View style={styles.stopSection}>
            <View style={styles.stopHeader}>
              <Text style={styles.stopName}>Stop {searchResults.code}</Text>
            </View>
            {searchResults.services.map(svc => {
              const arrivals = [svc.NextBus, svc.NextBus2, svc.NextBus3]
                .map(b => b ? getMinutes(b.EstimatedArrival) : null)
                .filter(m => m !== null && !isNaN(m));
              return (
                <View key={svc.ServiceNo} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.routeBadge}><Text style={styles.routeText}>{svc.ServiceNo}</Text></View>
                    <Text style={styles.operator}>{svc.Operator}</Text>
                  </View>
                  <View style={styles.arrivalRow}>
                    {arrivals.map((min, i) => (
                      <View key={i} style={[styles.pill, min <= 1 && styles.pillArriving]}>
                        <Text style={[styles.pillTime, min <= 1 && styles.pillTimeArriving]}>{formatMin(min)}</Text>
                        <Text style={styles.pillLabel}>{i === 0 ? 'next' : i === 1 ? '2nd' : '3rd'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>My favourite stops</Text>
        {loading ? <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 40 }} /> : (
          FAVOURITE_STOPS.map(s => (
            <View key={s.code} style={styles.stopSection}>
              <View style={styles.stopHeader}>
                <Text style={styles.stopName}>{s.name}</Text>
                <Text style={styles.stopCode}>{s.code}</Text>
              </View>
              {(stops[s.code] || []).map(svc => {
                const arrivals = [svc.NextBus, svc.NextBus2, svc.NextBus3]
                  .map(b => b ? getMinutes(b.EstimatedArrival) : null)
                  .filter(m => m !== null && !isNaN(m));
                return (
                  <View key={svc.ServiceNo} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.routeBadge}><Text style={styles.routeText}>{svc.ServiceNo}</Text></View>
                      <Text style={styles.operator}>{svc.Operator}</Text>
                    </View>
                    <View style={styles.arrivalRow}>
                      {arrivals.map((min, i) => (
                        <View key={i} style={[styles.pill, min <= 1 && styles.pillArriving]}>
                          <Text style={[styles.pillTime, min <= 1 && styles.pillTimeArriving]}>{formatMin(min)}</Text>
                          <Text style={styles.pillLabel}>{i === 0 ? 'next' : i === 1 ? '2nd' : '3rd'}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function MyBusesTab() {
    return (
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />}
      >
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>My buses</Text>
        {loading ? <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 40 }} /> : (
          MY_BUSES.map((b, i) => (
            <View key={i} style={styles.myBusCard}>
              <View style={styles.myBusHeader}>
                <View style={styles.routeBadge}>
                  <Text style={styles.routeText}>{b.busNo}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.myBusLabel}>{b.label}</Text>
                  <Text style={styles.myBusStop}>from {b.stopName}</Text>
                </View>
              </View>
              <ArrivalPills services={myBusData[b.stopCode] || []} busNo={b.busNo} />
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>🚌 Bus Arrivals</Text>
        {lastUpdated ? <Text style={styles.updated}>Updated {lastUpdated} · pull down to refresh</Text> : null}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stops' && styles.tabActive]}
          onPress={() => setActiveTab('stops')}
        >
          <Text style={[styles.tabText, activeTab === 'stops' && styles.tabTextActive]}>Bus Stops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mybuses' && styles.tabActive]}
          onPress={() => setActiveTab('mybuses')}
        >
          <Text style={[styles.tabText, activeTab === 'mybuses' && styles.tabTextActive]}>My Buses</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stops' ? <StopsTab /> : <MyBusesTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '600', color: '#1a1a1a' },
  updated: { fontSize: 12, color: '#999', marginTop: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#e8e8e8', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
  tabTextActive: { color: '#1a73e8', fontWeight: '600' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: '#1a73e8', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  stopSection: { marginBottom: 8 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
  stopName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  stopCode: { fontSize: 12, color: '#999' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeBadge: { backgroundColor: '#1a73e8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  routeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  operator: { fontSize: 13, color: '#888', marginLeft: 10 },
  arrivalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 64 },
  pillArriving: { backgroundColor: '#e6f4ea' },
  pillTime: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  pillTimeArriving: { color: '#1e7e34' },
  pillLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  myBusCard: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  myBusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  myBusLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  myBusStop: { fontSize: 12, color: '#999', marginTop: 2 },
  noData: { fontSize: 13, color: '#aaa', paddingBottom: 4 },
  error: { color: '#c0392b', textAlign: 'center', margin: 16 },
});