import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Loader2, Camera } from "lucide-react";
import ImageUpload from "./ImageUpload";

interface CreateServiceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateServiceModal = ({ onClose, onCreated }: CreateServiceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserNeighborhood();
  }, []);

  const loadUserNeighborhood = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("primary_neighborhood_id, whatsapp, instagram")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setNeighborhoodId(data.primary_neighborhood_id);
      setWhatsapp(data.whatsapp || "");
      setInstagram(data.instagram || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !neighborhoodId) return;

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("services").insert({
      user_id: user.id,
      neighborhood_id: neighborhoodId,
      title: title.trim(),
      description: description.trim() || null,
      whatsapp: whatsapp.trim() || null,
      instagram: instagram.trim() || null,
      image_url: imageUrl,
    });

    setLoading(false);

    if (!error) {
      onCreated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl shadow-elevated max-w-md w-full overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Cadastrar serviço</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload */}
            {userId && (
              <ImageUpload
                userId={userId}
                folder="services"
                onImageUploaded={(url) => setImageUrl(url || null)}
                existingUrl={imageUrl}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título do serviço *</Label>
              <Input
                id="title"
                placeholder="Ex: Manicure e Pedicure"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva seu serviço..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@seuusuario"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 btn-maridaas" disabled={loading || !title.trim()}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cadastrar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateServiceModal;
