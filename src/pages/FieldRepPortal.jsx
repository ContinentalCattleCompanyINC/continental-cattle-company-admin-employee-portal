import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Camera, Upload, Plus, CheckCircle, Clock, XCircle, MapPin, DollarSign, Weight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BREED_TYPES, SEX_OPTIONS } from '@/lib/cattleConfig';

const SUBMISSION_TYPES = [
  { value: 'lot_listing', label: 'New Lot Listing' },
  { value: 'lot_update', label: 'Lot Update' },
  { value: 'health_event', label: 'Health Event' },
  { value: 'weight_update', label: 'Weight Update' },
  { value: 'load_available', label: 'Load Available' },
];

const ENTITIES = ['Continental', 'Rincon', 'Flying3BarB', 'GrandSlam', 'FullCount', 'BeesonBulls'];

const STATUS_STYLE = {
  pending: 'bg-warning/15 text-warning border-warning/20',
  approved: 'bg-success/15 text-success border-success/20',
  rejected: 'bg-danger/15 text-danger border-danger/20',
  published: 'bg-primary/15 text-primary border-primary/20',
};

export default function FieldRepPortal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    submission_type: 'lot_listing',
    entity: 'Continental',
    title: '',
    description: '',
    breed_type: '',
    sex: '',
    head_count: '',
    location: '',
    weight_estimate: '',
    price_ask: '',
    health_notes: '',
    photos: [],
  });

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const { data: submissions = [] } = useQuery({
    queryKey: ['fieldSubmissions'],
    queryFn: () => base44.entities.FieldSubmission.list('-created_date', 50),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldSubmission.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fieldSubmissions'] });
      toast.success('Submission sent for approval');
      setShowForm(false);
      setForm({ submission_type: 'lot_listing', entity: 'Continental', title: '', description: '', breed_type: '', sex: '', head_count: '', location: '', weight_estimate: '', price_ask: '', health_notes: '', photos: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FieldSubmission.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fieldSubmissions'] }),
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...urls] }));
    setUploading(false);
    toast.success(`${urls.length} photo(s) uploaded`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      head_count: form.head_count ? Number(form.head_count) : undefined,
      weight_estimate: form.weight_estimate ? Number(form.weight_estimate) : undefined,
      price_ask: form.price_ask ? Number(form.price_ask) : undefined,
      submitted_by: user.email,
    });
  };

  const mySubmissions = isAdmin ? submissions : submissions.filter(s => s.submitted_by === user?.email);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="FIELD REP PORTAL"
          subtitle="Submit lot listings, updates, and field reports from the field"
          badge={isAdmin ? 'Admin View' : 'Field Rep'}
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Submission
        </button>
      </div>

      {/* New Submission Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-bebas text-lg text-primary">NEW FIELD SUBMISSION</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Submission Type</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.submission_type} onChange={e => setForm(f => ({ ...f, submission_type: e.target.value }))}>
                  {SUBMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Entity</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}>
                  {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  placeholder="e.g. 45 Holstein Steers @ Buffalo"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Breed Type</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.breed_type} onChange={e => setForm(f => ({ ...f, breed_type: e.target.value }))}>
                  <option value="">Select breed...</option>
                  {BREED_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sex</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value }))}>
                  <option value="">Select sex...</option>
                  {SEX_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Head Count</label>
                <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.head_count} onChange={e => setForm(f => ({ ...f, head_count: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Avg Weight (lbs)</label>
                <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.weight_estimate} onChange={e => setForm(f => ({ ...f, weight_estimate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ask Price ($/cwt)</label>
                <input type="number" step="0.01" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.price_ask} onChange={e => setForm(f => ({ ...f, price_ask: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location / GPS</label>
              <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                placeholder="City, State or GPS coordinates"
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description / Notes</label>
              <textarea rows={3} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
                placeholder="Condition, frame, health status, any relevant details..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Photos</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
                {form.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-border" />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {isAdmin ? 'All Submissions' : 'My Submissions'} ({mySubmissions.length})
          </h3>
          {isAdmin && (
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="text-warning">{submissions.filter(s => s.status === 'pending').length} pending</span>
              <span>·</span>
              <span className="text-success">{submissions.filter(s => s.status === 'approved').length} approved</span>
            </div>
          )}
        </div>

        {mySubmissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            No submissions yet. Hit "New Submission" to start.
          </div>
        ) : (
          mySubmissions.map(sub => (
            <div key={sub.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bebas text-base text-foreground">{sub.title}</span>
                    <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                      {SUBMISSION_TYPES.find(t => t.value === sub.submission_type)?.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLE[sub.status]}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                    {sub.entity && <span className="text-primary">{sub.entity}</span>}
                    {sub.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{sub.location}</span>}
                    {sub.head_count && <span>{sub.head_count} hd</span>}
                    {sub.weight_estimate && <span><Weight className="w-3 h-3 inline" /> {sub.weight_estimate} lbs</span>}
                    {sub.price_ask && <span className="text-success"><DollarSign className="w-3 h-3 inline" />{sub.price_ask}/cwt</span>}
                    <span>{sub.created_date ? format(new Date(sub.created_date), 'MMM d, h:mm a') : ''}</span>
                  </div>
                  {sub.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.description}</p>}
                  {sub.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {sub.photos.slice(0, 5).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" />
                      ))}
                      {sub.photos.length > 5 && <div className="w-14 h-14 bg-secondary rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">+{sub.photos.length - 5}</div>}
                    </div>
                  )}
                  {sub.admin_notes && (
                    <div className="mt-2 text-xs bg-secondary/50 rounded-lg px-3 py-2 text-muted-foreground italic">
                      Admin: {sub.admin_notes}
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {isAdmin && sub.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => updateMutation.mutate({ id: sub.id, data: { status: 'approved', reviewed_by: user.email, reviewed_date: new Date().toISOString().split('T')[0] } })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-success/15 text-success border border-success/20 rounded text-xs font-medium hover:bg-success/25 transition-colors">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => updateMutation.mutate({ id: sub.id, data: { status: 'rejected', reviewed_by: user.email, reviewed_date: new Date().toISOString().split('T')[0] } })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-danger/15 text-danger border border-danger/20 rounded text-xs font-medium hover:bg-danger/25 transition-colors">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                    <button onClick={() => updateMutation.mutate({ id: sub.id, data: { status: 'published', publish_to_marketplace: true, reviewed_by: user.email, reviewed_date: new Date().toISOString().split('T')[0] } })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/15 text-primary border border-primary/20 rounded text-xs font-medium hover:bg-primary/25 transition-colors">
                      Publish Live
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}