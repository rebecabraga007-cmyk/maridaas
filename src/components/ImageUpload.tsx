import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Camera as CameraIcon, X, Loader2, ImagePlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { isNativePlatform } from "@/lib/platform";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  userId: string;
  folder?: string;
  className?: string;
  existingUrl?: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024;

const ImageUpload = ({
  onImageUploaded,
  userId,
  folder = "posts",
  className = "",
  existingUrl,
}: ImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSet = <T,>(setter: (v: T) => void, v: T) => {
    if (mountedRef.current) setter(v);
  };

  const uploadBlob = async (blob: Blob, ext: string) => {
    const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("user-uploads")
      .upload(fileName, blob, { upsert: true, contentType: blob.type || "image/jpeg" });

    if (error) {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
      safeSet(setPreview, null);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("user-uploads").getPublicUrl(data.path);

    onImageUploaded(publicUrl);
    toast({ title: "Imagem enviada!" });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    safeSet(setUploading, true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => safeSet(setPreview, reader.result as string);
      reader.readAsDataURL(file);

      const ext = file.name.split(".").pop() || "jpg";
      await uploadBlob(file, ext);
    } catch (err) {
      console.error("[ImageUpload] file change failed", err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível processar a imagem.",
        variant: "destructive",
      });
    } finally {
      safeSet(setUploading, false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const pickFromNativeCamera = async (useCamera: boolean) => {
    safeSet(setChooserOpen, false);
    safeSet(setUploading, true);
    try {
      // Lazy import keeps web bundle small and avoids breaking SSR/dev preview.
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

      // Defensive permission check — never crash if the user denied them.
      try {
        const perms = await Camera.checkPermissions();
        const need = useCamera ? perms.camera : perms.photos;
        if (need !== "granted") {
          const req = await Camera.requestPermissions({
            permissions: useCamera ? ["camera"] : ["photos"],
          });
          const got = useCamera ? req.camera : req.photos;
          if (got !== "granted" && got !== "limited") {
            toast({
              title: "Permissão necessária",
              description:
                "Habilite Câmera e Fotos nos Ajustes do iPhone para enviar uma imagem.",
              variant: "destructive",
            });
            return;
          }
        }
      } catch (permErr) {
        // Some platforms (older iOS, simulators) throw on checkPermissions.
        // Fall through and let getPhoto prompt the system dialog.
        console.warn("[ImageUpload] permission probe failed", permErr);
      }

      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: useCamera ? CameraSource.Camera : CameraSource.Photos,
        presentationStyle: "popover", // iPad-safe
        saveToGallery: false,
      });

      if (!photo?.webPath) return;

      safeSet(setPreview, photo.webPath);

      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      if (blob.size > MAX_BYTES) {
        toast({
          title: "Imagem muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        safeSet(setPreview, null);
        return;
      }
      await uploadBlob(blob, photo.format || "jpg");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Apple/Capacitor returns these strings when the user backs out — silent.
      if (
        /cancel/i.test(msg) ||
        /User cancelled/i.test(msg) ||
        /No image picked/i.test(msg)
      ) {
        return;
      }
      console.error("[ImageUpload] native camera failed", err);
      toast({
        title: "Não foi possível abrir a câmera",
        description: "Tente novamente ou escolha uma foto da galeria.",
        variant: "destructive",
      });
    } finally {
      safeSet(setUploading, false);
    }
  };

  const onPickerClick = (e: React.MouseEvent) => {
    if (isNativePlatform()) {
      e.preventDefault();
      setChooserOpen(true);
    }
    // Web: default <label htmlFor> behaviour opens the file input.
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
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
            aria-label="Remover imagem"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onClick={onPickerClick}
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <CameraIcon className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Adicionar foto</span>
            </>
          )}
        </label>
      )}

      <AlertDialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar foto</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha de onde você quer pegar a imagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void pickFromNativeCamera(true);
              }}
              className="w-full justify-start"
            >
              <CameraIcon className="w-4 h-4 mr-2" /> Tirar foto
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void pickFromNativeCamera(false);
              }}
              className="w-full justify-start"
            >
              <ImagePlus className="w-4 h-4 mr-2" /> Escolher da galeria
            </AlertDialogAction>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImageUpload;
