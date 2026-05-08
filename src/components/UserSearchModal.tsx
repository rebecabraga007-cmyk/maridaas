import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import { Search, User, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserResult {
  user_id: string;
  full_name: string;
  neighborhood: string;
  city: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSearchModal = ({ isOpen, onClose }: UserSearchModalProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("search_users_global" as any, {
      search_term: searchQuery,
    });

    if (data && Array.isArray(data)) {
      setResults(
        data.map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.neighborhood,
          city: p.city,
        }))
      );
    } else if (error) {
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar usuárias agora. Tente novamente.",
        variant: "destructive",
      });
      setResults([]);
    }

    setLoading(false);
  };

  const handleSelectUser = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar usuárias</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Digite o nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : results.length === 0 && searchQuery.length >= 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma usuária encontrada</p>
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.user_id}
                onClick={() => handleSelectUser(user.user_id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {user.neighborhood}, {user.city}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSearchModal;
