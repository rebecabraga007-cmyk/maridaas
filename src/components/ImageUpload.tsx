import { useId, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  userId: string;
  folder?: string;
  className?: string;
  existingUrl?: string | null;
}

const ImageUpload = ({ onImageUploaded, userId, folder = "posts", className = "", existingUrl }: ImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem.", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("user-uploads")
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
      setPreview(null);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from("user-uploads")
        .getPublicUrl(data.path);
      
      onImageUploaded(publicUrl);
      toast({ title: "Imagem enviada!" });
    }

    setUploading(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id={inputId}
      />
      
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Adicionar foto</span>
            </>
          )}
        </label>
      )}
    </div>
  );
};

export default ImageUpload;
