import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function AlertSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [allSpecies, setAllSpecies] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    alert_type: 'both',
    species_ids: [],
    zone_ids: [],
    enable_email: true,
    enable_in_app: true,
    frequency: 'immediate'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [userSubs, species, zones] = await Promise.all([
        base44.entities.AlertSubscription.filter(
          { user_email: user.email },
          '-created_date',
          100
        ),
        base44.entities.Species.list('-updated_date', 100),
        base44.entities.GeoJSONBoundary.list('-created_date', 100)
      ]);

      setSubscriptions(userSubs);
      setAllSpecies(species);
      setAllZones(zones);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async () => {
    if (formData.alert_type === 'species' && formData.species_ids.length === 0) {
      toast.error('Select at least one species');
      return;
    }
    if (formData.alert_type === 'zone' && formData.zone_ids.length === 0) {
      toast.error('Select at least one zone');
      return;
    }

    try {
      const speciesNames = formData.species_ids
        .map(id => allSpecies.find(s => s.id === id)?.scientific_name || '')
        .filter(Boolean);
      const zoneNames = formData.zone_ids
        .map(id => allZones.find(z => z.id === id)?.name || '')
        .filter(Boolean);

      await base44.entities.AlertSubscription.create({
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        alert_type: formData.alert_type,
        species_ids: formData.species_ids,
        species_names: speciesNames,
        zone_ids: formData.zone_ids,
        zone_names: zoneNames,
        enable_email: formData.enable_email,
        enable_in_app: formData.enable_in_app,
        frequency: formData.frequency,
        active: true
      });

      await loadData();
      setShowForm(false);
      setFormData({
        alert_type: 'both',
        species_ids: [],
        zone_ids: [],
        enable_email: true,
        enable_in_app: true,
        frequency: 'immediate'
      });
      toast.success('Alert subscription created');
    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error('Failed to create subscription');
    }
  };

  const handleDeleteSubscription = async (id) => {
    try {
      await base44.entities.AlertSubscription.delete(id);
      setSubscriptions(subscriptions.filter(s => s.id !== id));
      toast.success('Subscription removed');
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      toast.error('Failed to remove subscription');
    }
  };

  const handleToggleActive = async (sub) => {
    try {
      await base44.entities.AlertSubscription.update(sub.id, {
        active: !sub.active
      });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alert Subscriptions
          </CardTitle>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-bangor-red hover:bg-bangor-red/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        {showForm && (
          <div className="p-4 bg-slate-50 rounded-lg space-y-4 border border-slate-200">
            <div>
              <label className="text-sm font-semibold block mb-2">Alert Type</label>
              <select
                value={formData.alert_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alert_type: e.target.value,
                    species_ids: e.target.value === 'zone' ? [] : formData.species_ids,
                    zone_ids: e.target.value === 'species' ? [] : formData.zone_ids
                  })
                }
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="species">Track Species</option>
                <option value="zone">Monitor Conservation Zone</option>
                <option value="both">Both Species & Zones</option>
              </select>
            </div>

            {(formData.alert_type === 'species' || formData.alert_type === 'both') && (
              <div>
                <label className="text-sm font-semibold block mb-2">Species to Track</label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {allSpecies.slice(0, 50).map(species => (
                    <label key={species.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.species_ids.includes(species.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              species_ids: [...formData.species_ids, species.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              species_ids: formData.species_ids.filter(id => id !== species.id)
                            });
                          }
                        }}
                      />
                      {species.scientific_name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(formData.alert_type === 'zone' || formData.alert_type === 'both') && (
              <div>
                <label className="text-sm font-semibold block mb-2">Zones to Monitor</label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {allZones.slice(0, 50).map(zone => (
                    <label key={zone.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.zone_ids.includes(zone.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              zone_ids: [...formData.zone_ids, zone.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              zone_ids: formData.zone_ids.filter(id => id !== zone.id)
                            });
                          }
                        }}
                      />
                      {zone.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.enable_email}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enable_email: checked })
                  }
                />
                Email Alerts
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.enable_in_app}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enable_in_app: checked })
                  }
                />
                In-App Alerts
              </label>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSubscription}
                className="bg-bangor-red hover:bg-bangor-red/90"
              >
                Create Alert
              </Button>
            </div>
          </div>
        )}

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            No active alerts. Create one to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(sub => (
              <div
                key={sub.id}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          sub.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }
                      >
                        {sub.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-700">
                        {sub.alert_type === 'both'
                          ? 'Species & Zones'
                          : sub.alert_type === 'species'
                          ? 'Species'
                          : 'Zones'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteSubscription(sub.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                {sub.species_names && sub.species_names.length > 0 && (
                  <p className="text-xs text-slate-600 mb-1">
                    <span className="font-semibold">Species:</span> {sub.species_names.join(', ')}
                  </p>
                )}
                {sub.zone_names && sub.zone_names.length > 0 && (
                  <p className="text-xs text-slate-600 mb-2">
                    <span className="font-semibold">Zones:</span> {sub.zone_names.join(', ')}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {sub.enable_email && (
                    <Badge variant="outline" className="text-xs">
                      📧 Email
                    </Badge>
                  )}
                  {sub.enable_in_app && (
                    <Badge variant="outline" className="text-xs">
                      🔔 In-App
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {sub.frequency}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => handleToggleActive(sub)}
                >
                  {sub.active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}