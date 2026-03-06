import { useEffect, useRef, useState } from "react";

type Obra = {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  registros: number;
};

type ObraCardProps = {
  obra: Obra;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ObraCard({
  obra,
  onOpen,
  onEdit,
  onDelete,
}: ObraCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="rdo-card rdo-list-card">
      <div className="rdo-list-card-content" onClick={() => onOpen(obra.id)}>
        <h3 className="rdo-list-card-title">{obra.nome}</h3>
        <p className="rdo-list-card-meta">
          <strong>Cliente:</strong> {obra.cliente || "—"}
        </p>
        <p className="rdo-list-card-meta">
          <strong>Endereço:</strong> {obra.endereco || "—"}
        </p>
        <p className="rdo-list-card-meta">
          <strong>Registros:</strong> {obra.registros}
        </p>
      </div>

      <div className="rdo-menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="rdo-menu-button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="rdo-dropdown-menu">
            <button
              type="button"
              className="rdo-dropdown-item"
              onClick={() => {
                setMenuOpen(false);
                onEdit(obra.id);
              }}
            >
              Editar
            </button>

            <button
              type="button"
              className="rdo-dropdown-item rdo-dropdown-item-danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(obra.id);
              }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}