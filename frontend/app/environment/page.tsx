"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Dog, EnvironmentRisk } from "@/types";

const riskLevelColors: Record<string, { bg: string; text: string; icon: string }> = {
    low: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: "✅" },
    moderate: { bg: "bg-amber-500/15", text: "text-amber-400", icon: "⚠️" },
    high: { bg: "bg-orange-500/15", text: "text-orange-400", icon: "🔶" },
    critical: { bg: "bg-rose-500/15", text: "text-rose-400", icon: "🚨" },
};

export default function EnvironmentPage() {
    const [dogs, setDogs] = useState<Dog[]>([]);
    const [selectedDog, setSelectedDog] = useState("");
    const [lat, setLat] = useState("28.6139");
    const [lng, setLng] = useState("77.2090");
    const [risk, setRisk] = useState<EnvironmentRisk | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.dogs.list(0, 100).then((data) => setDogs(data.dogs)).catch(() => { });
    }, []);

    const useCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLat(pos.coords.latitude.toFixed(4));
                    setLng(pos.coords.longitude.toFixed(4));
                },
                () => alert("Location access denied")
            );
        }
    };

    const assessRisk = async () => {
        if (!selectedDog) return;
        setLoading(true);
        setRisk(null);
        setError(null);
        try {
            const result = await api.environment.risk(
                parseInt(selectedDog),
                parseFloat(lat),
                parseFloat(lng)
            );
            setRisk(result);
            localStorage.setItem("last_risk_assessment", JSON.stringify(result));
        } catch (err) {
            console.error("Risk assessment failed:", err);

            // Trigger Fallback Logic on Frontend Networking Failure
            const savedRisk = localStorage.getItem("last_risk_assessment");
            if (savedRisk) {
                try {
                    const parsed = JSON.parse(savedRisk);
                    parsed.is_fallback = true;
                    parsed.fallback_reasons = ["Network Error: Unable to reach backend"];
                    setRisk(parsed);
                    setError(null);
                    return;
                } catch (e) {
                    console.error("Failed to parse fallback risk", e);
                }
            }

            setError("Unable to reach the server. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const riskStyle = risk ? riskLevelColors[risk.risk_level] || riskLevelColors.moderate : null;

    // Safe number formatter helper
    const safeFixed = (val: any, digits: number = 0): string => {
        if (typeof val !== "number" || isNaN(val)) return "0";
        return val.toFixed(digits);
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Environmental Risk Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Location-based allergy risk scoring with activity guidance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 transition-all hover:scale-105"
                        onClick={() => {
                            if (dogs.length > 0) {
                                setSelectedDog(dogs[0].id.toString());
                                setLat("40.7128");
                                setLng("-74.0060");
                            }
                        }}
                    >
                        🧬 Load Demo Case
                    </Button>
                </div>
            </div>

            {/* Input */}
            <Card className="glass border-white/10 bg-black/40 backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Select value={selectedDog} onValueChange={setSelectedDog}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select dog..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    {dogs.map((dog) => (
                                        <SelectItem key={dog.id} value={dog.id.toString()}>
                                            {dog.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Input
                                placeholder="Latitude"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                type="number"
                                step="0.0001"
                                className="bg-white/5 border-white/10 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <Input
                                placeholder="Longitude"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                                type="number"
                                step="0.0001"
                                className="bg-white/5 border-white/10 focus:ring-primary/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={assessRisk}
                                disabled={!selectedDog || loading}
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.3)] border-t-white" />
                                        Analyzing environment and allergies...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">🌿 Assess Risk</span>
                                )}
                            </Button>
                            <Button variant="outline" onClick={useCurrentLocation} className="border-white/10 hover:bg-white/5">
                                📍
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loading Skeleton */}
            {loading && (
                <div className="space-y-4 animate-pulse">
                    <Card className="glass h-48 border-white/5 bg-white/5" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="glass h-24 border-white/5 bg-white/5" />
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {risk && !loading && (
                <div className="space-y-4 animate-fade-in">
                    {/* Partial Success UI */}
                    {risk.is_fallback && (
                        <Card className="glass border-amber-500/30 bg-amber-500/10 mb-4 animate-in fade-in">
                            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-emerald-400 font-medium flex items-center gap-2">
                                        <span>✅ Basic Assessment Available</span>
                                    </h4>
                                    <p className="text-amber-400/90 text-sm flex items-center gap-2">
                                        <span>⚠ Advanced AI Analysis temporarily unavailable</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        We&apos;re using safe fallback data to continue your assessment. ({risk.fallback_reasons?.join(', ') || 'API Failure'})
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20" onClick={assessRisk}>
                                    🔄 Retry Full Analysis
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Risk Score Hero */}
                    <Card className={`glass border-white/10 overflow-hidden relative ${riskStyle?.bg}`}>
                        <div className="absolute top-0 right-0 p-4 text-white/10 text-8xl font-black pointer-events-none select-none">
                            {risk.risk_level.toUpperCase()}
                        </div>
                        <CardContent className="p-8 text-center relative z-10">
                            <div className="text-5xl mb-3">{riskStyle?.icon}</div>
                            <div className="text-7xl font-bold mb-2 tracking-tighter" style={{
                                background: `linear-gradient(135deg, ${risk.environmental_risk_score < 30 ? '#10b981' : risk.environmental_risk_score < 60 ? '#f59e0b' : '#ef4444'}, ${risk.environmental_risk_score < 30 ? '#14b8a6' : risk.environmental_risk_score < 60 ? '#f97316' : '#f43f5e'})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                {safeFixed(risk.environmental_risk_score, 0)}
                            </div>
                            <p className={`text-sm font-semibold uppercase tracking-widest ${riskStyle?.text}`}>
                                {risk.risk_level} Risk
                            </p>
                            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                                {risk.explanation || "Detailed environmental impact analysis summary."}
                            </p>
                            <div className="flex justify-center gap-2 mt-6 flex-wrap">
                                {Number(risk.ml_model_contribution) > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-3 py-1"
                                    >
                                        ✨ ML Forecast (+{safeFixed(risk.ml_model_contribution, 0)})
                                    </Badge>
                                )}
                                {risk.allergy_trigger_detected && (
                                    <Badge
                                        variant="secondary"
                                        className={risk.allergy_severity_level === "CRITICAL" || risk.allergy_severity_level === "HIGH" ? "bg-rose-500/20 text-rose-300 border-rose-500/50 px-3 py-1" : "bg-amber-500/20 text-amber-300 border-amber-500/50 px-3 py-1"}
                                    >
                                        ⚠️ Allergy Impact {risk.allergy_severity_level && `(${risk.allergy_severity_level})`} (+{safeFixed(risk.allergy_impact_score, 0)})
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Environmental Data */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(risk.environmental_data || {}).map(([key, val]) => (
                            <Card key={key} className="glass border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                <CardContent className="p-4 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        {key.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-lg font-bold mt-1 text-slate-200">
                                        {typeof val === "number" ? val.toFixed(1) : (val ?? "N/A")}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Trigger Factors */}
                    {risk.trigger_factors && risk.trigger_factors.length > 0 && (
                        <Card className="glass border-amber-500/20 bg-amber-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-amber-400 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                    Detected Triggers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {risk.trigger_factors.map((alert, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-slate-300">
                                            {alert}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Activity Guidance */}
                    {risk.activity_guidance && risk.activity_guidance.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {risk.activity_guidance.map((g, i) => (
                                <Card key={i} className="glass border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-default">
                                    <CardContent className="p-5 flex items-start gap-4">
                                        <div className="text-3xl bg-white/5 p-2 rounded-xl border border-white/10">{g.icon || "🐾"}</div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-200">{g.activity}</h4>
                                            <p className="text-xs text-slate-400 mt-1 leading-normal">{g.recommendation}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Vaccine Recommendations */}
                    {risk.vaccine_recommendations && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="glass border-emerald-500/20 bg-emerald-500/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                        Recommended General Vaccines
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {risk.vaccine_recommendations.safe.length === 0 ? (
                                            <p className="text-xs text-slate-400">No safe vaccines found.</p>
                                        ) : (
                                            risk.vaccine_recommendations.safe.map((v, i) => (
                                                <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex flex-col gap-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-bold text-slate-200">{v.name}</span>
                                                        <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30">Safe</Badge>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{v.reason}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass border-rose-500/20 bg-rose-500/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-rose-400 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                                        Restricted (Allergy-Sensitive)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {risk.vaccine_recommendations.restricted.length === 0 ? (
                                            <p className="text-xs text-slate-400">No restricted vaccines.</p>
                                        ) : (
                                            risk.vaccine_recommendations.restricted.map((v, i) => (
                                                <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex flex-col gap-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-bold text-slate-200">{v.name}</span>
                                                        <Badge variant="outline" className="text-[10px] text-rose-300 border-rose-500/30">Not Recommended</Badge>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium text-rose-200">{v.reason}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="pt-4 opacity-50 hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-center text-slate-500 uppercase tracking-[0.2em] max-w-2xl mx-auto">
                            ⚠️ {risk.disclaimer || "AI-generated advisory. Always consult a veterinarian for clinical diagnosis."}
                        </p>
                    </div>
                </div>
            )}

            {/* Empty / Error */}
            {!risk && !loading && (
                <Card className={`glass border-border/50 ${error ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                    <CardContent className="p-12 text-center">
                        {error ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="text-5xl mb-4 p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">⚠</div>
                                <h3 className="text-lg font-medium mb-2 text-amber-400">Unable to complete full analysis</h3>
                                <p className="text-sm text-slate-300 max-w-[280px] mb-6">{error}</p>
                                <Button onClick={assessRisk} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 w-full md:w-auto shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                    🔄 Retry Connection
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="text-5xl mb-4">🌍</div>
                                <h3 className="text-lg font-medium mb-2">Check Environmental Risk</h3>
                                <p className="text-sm text-muted-foreground">
                                    Select a dog and location to assess environmental allergy risks
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
