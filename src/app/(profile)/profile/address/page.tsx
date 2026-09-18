"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserAddresses, deleteAddress } from "@/app/actions/address";
import { toast } from "react-hot-toast";
import AddressForm from "../../components/AddressForm";
import Modal from "@/components/ui/Modal";
import { IAddress } from "@/models/Address";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<IAddress | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load addresses:", err);
      toast.error("Could not load your addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await deleteAddress(id);
      toast.success("Address deleted");
      fetchAddresses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete address.");
    }
  };

  const openAdd = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const openEdit = (addr: IAddress) => {
    setEditingAddress(addr);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleSuccess = () => {
    closeForm();
    toast.success(editingAddress ? "Address updated" : "Address added");
    fetchAddresses();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My addresses</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your delivery addresses.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add address
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            Loading addresses…
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No addresses yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first address to speed up checkout.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add your first address
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {addresses.map((addr: any) => (
              <li
                key={addr._id?.toString()}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {addr.label || "Untitled"}
                      </h3>
                      {addr.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {addr.street}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[addr.city, addr.state, addr.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                      {addr.country ? `, ${addr.country}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => openEdit(addr)}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(addr._id?.toString())}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingAddress ? "Edit address" : "Add new address"}
        description={
          editingAddress
            ? "Update the details of this address."
            : "Fill in the details for your new address."
        }
      >
        <AddressForm
          initialData={editingAddress}
          onSuccess={handleSuccess}
          onCancel={closeForm}
        />
      </Modal>
    </div>
  );
}
