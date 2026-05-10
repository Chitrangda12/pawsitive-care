"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { BreedEnum, AllergyCategory } from "@/types";
import type { Dog } from "@/types";

export default function DogsPage() {
    const [dogs, setDogs] = useState<Dog[]>([]);
    const [masterAllergies, setMasterAllergies] = useState<import("@/types").Allergy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        breed: "" as BreedEnum | "",
        age_years: "",
        weight_kg: "",
        owner_name: "",
    });
    const [selectedAllergyIds, setSelectedAllergyIds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dogsData, allergiesData] = await Promise.all([
                api.dogs.list(0, 50),
                api.allergies.listMaster()
            ]);
            setDogs(dogsData.dogs);
            setMasterAllergies(allergiesData);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleAllergy = (id: number) => {
        setSelectedAllergyIds((prev) =>
            prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.breed || !formData.age_years || !formData.weight_kg || !formData.owner_name) return;

        setSaving(true);
        try {
            await api.dogs.create({
                name: formData.name,
                breed: formData.breed as BreedEnum,
                age_years: parseFloat(formData.age_years),
                weight_kg: parseFloat(formData.weight_kg),
                owner_name: formData.owner_name,
                allergy_ids: selectedAllergyIds,
            });

            setFormData({ name: "", breed: "", age_years: "", weight_kg: "", owner_name: "" });
            setSelectedAllergyIds([]);
            setShowForm(false);
            fetchData();
        } catch (err) {
            console.error("Failed to create dog:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this dog profile?")) return;
        try {
            await api.dogs.delete(id);
            fetchData();
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    const allergiesByCategory = masterAllergies.reduce((acc, a) => {
        const cat = a.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, import("@/types").Allergy[]>);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dog Profiles</h1>
                    <p className="text-muted-foreground mt-1">Manage dog profiles and allergy records</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                    {showForm ? "✕ Cancel" : "＋ Add Dog"}
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <Card className="glass border-primary/20 glow-emerald animate-fade-in">
                    <CardHeader>
                        <CardTitle className="text-lg">New Dog Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dog-name">Dog Name</Label>
                                    <Input
                                        id="dog-name"
                                        placeholder="e.g. Buddy"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="breed">Breed</Label>
                                    <Select
                                        value={formData.breed}
                                        onValueChange={(v) => setFormData({ ...formData, breed: v as BreedEnum })}
                                    >
                                        <SelectTrigger id="breed">
                                            <SelectValue placeholder="Select breed" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(BreedEnum).map((breed) => (
                                                <SelectItem key={breed} value={breed}>
                                                    {breed}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age (years)</Label>
                                    <Input
                                        id="age"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="30"
                                        placeholder="e.g. 3.5"
                                        value={formData.age_years}
                                        onChange={(e) => setFormData({ ...formData, age_years: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Weight (kg)</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        placeholder="e.g. 28.5"
                                        value={formData.weight_kg}
                                        onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="owner">Owner Name</Label>
                                    <Input
                                        id="owner"
                                        placeholder="e.g. John Smith"
                                        value={formData.owner_name}
                                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Allergy Selector */}
                            <div>
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    ⚠️ Allergy Profile
                                    {selectedAllergyIds.length > 0 && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            {selectedAllergyIds.length} selected
                                        </Badge>
                                    )}
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(allergiesByCategory).map(
                                        ([category, allergies]) => (
                                            <div key={category}>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                                    {category} Allergens
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {allergies.map((allergy) => {
                                                        const isSelected = selectedAllergyIds.includes(allergy.id);
                                                        return (
                                                            <label
                                                                key={allergy.id}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${isSelected
                                                                    ? "bg-destructive/15 border-destructive/50 text-destructive"
                                                                    : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                                                                    }`}
                                                            >
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => toggleAllergy(allergy.id)}
                                                                    className="h-3 w-3"
                                                                />
                                                                {allergy.name}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={saving} className="gap-2">
                                    {saving ? "⏳ Saving..." : "✓ Create Profile"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Dog List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="glass border-border/50 animate-pulse">
                            <CardContent className="p-6 h-36" />
                        </Card>
                    ))}
                </div>
            ) : dogs.length === 0 ? (
                <Card className="glass border-border/50">
                    <CardContent className="p-12 text-center">
                        <div className="text-5xl mb-4">🐾</div>
                        <h3 className="text-lg font-medium mb-2">No dogs registered yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your first dog profile to get started
                        </p>
                        <Button onClick={() => setShowForm(true)}>＋ Add Dog</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dogs.map((dog, i) => (
                        <Card
                            key={dog.id}
                            className="glass border-border/50 hover:border-primary/30 transition-all animate-fade-in group"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                                            🐕
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{dog.name}</h3>
                                            <p className="text-xs text-muted-foreground">{dog.breed}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(dog.id)}
                                        className="text-muted-foreground/40 hover:text-destructive transition-colors text-sm opacity-0 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                                    <div className="bg-secondary/30 rounded-lg px-3 py-2">
                                        <span className="text-muted-foreground">Age</span>
                                        <p className="font-medium">{dog.age_years ?? "—"} yrs</p>
                                    </div>
                                    <div className="bg-secondary/30 rounded-lg px-3 py-2">
                                        <span className="text-muted-foreground">Weight</span>
                                        <p className="font-medium">{dog.weight_kg ?? "—"} kg</p>
                                    </div>
                                </div>

                                {dog.allergies.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {dog.allergies.map((a) => (
                                            <Badge key={a.id} variant="destructive" className="text-[10px]">
                                                {a.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <Link href={`/vaccinations?dog=${dog.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                                            💉 Vaccines
                                        </Button>
                                    </Link>
                                    <Link href={`/diet?dog=${dog.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                                            🍖 Diet
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
