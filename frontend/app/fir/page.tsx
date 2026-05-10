"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { UrgencyLevel } from "@/types";
import type { Dog, FIRReport, EnvironmentRisk } from "@/types";

const urgencyStyles: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    [UrgencyLevel.LOW]: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "LOW", icon: "🟢" },
    [UrgencyLevel.MEDIUM]: { bg: "bg-amber-500/15", text: "text-amber-400", label: "MEDIUM", icon: "🟡" },
    [UrgencyLevel.HIGH]: { bg: "bg-rose-500/15", text: "text-rose-400", label: "HIGH", icon: "🔴" },
    [UrgencyLevel.CRITICAL]: { bg: "bg-rose-500/30", text: "text-rose-300", label: "CRITICAL", icon: "🚨" },
};

export default function FIRPage() {
    const [dogs, setDogs] = useState<Dog[]>([]);
    const [selectedDog, setSelectedDog] = useState("");
    const [symptoms, setSymptoms] = useState("");
    const [report, setReport] = useState<FIRReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [envContext, setEnvContext] = useState<EnvironmentRisk | null>(null);

    useEffect(() => {
        api.dogs.list(0, 100).then((data) => setDogs(data.dogs)).catch(() => { });

        // Auto-fill environmental context if available
        const savedRisk = localStorage.getItem("last_risk_assessment");
        if (savedRisk) {
            try {
                const parsed = JSON.parse(savedRisk);
                setEnvContext(parsed);
            } catch (e) {
                console.error("Failed to parse saved risk assessment");
            }
        }
    }, []);



    const generateFIR = async () => {
        if (!selectedDog || symptoms.length < 5) return;
        setLoading(true);
        setReport(null);
        setError(null);
        try {
            const result = await api.fir.generate(
                parseInt(selectedDog),
                symptoms,
                envContext || undefined
            );
            setReport(result);
        } catch (err) {
            console.error("FIR generation failed:", err);
            setError("Unable to reach the server. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const urgStyle = report ? urgencyStyles[report.urgency] || urgencyStyles[UrgencyLevel.MEDIUM] : null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Multimodal FIR Engine</h1>
                    <p className="text-muted-foreground mt-1">
                        AI-assisted health reporting with vision and environmental intelligence
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
                        onClick={() => {
                            if (dogs.length > 0) {
                                setSelectedDog(dogs[0].id.toString());
                                setSymptoms("My dog has red itchy patches on his paws and belly. He is licking them constantly and seems very uncomfortable.");
                            }
                        }}
                    >
                        🧬 Load Demo Case
                    </Button>
                    {envContext && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3 cursor-help" title="🌍 Contextual Intelligence: This analysis is using real-time data from your last environmental risk assessment.">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Env Context Injected
                        </Badge>
                    )}
                </div>
            </div>

            {/* Input Form */}
            <Card className="glass border-border/50">
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-4">
                            <div>
                                <Label>Select Dog</Label>
                                <Select value={selectedDog} onValueChange={setSelectedDog}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select a dog..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dogs.map((dog) => (
                                            <SelectItem key={dog.id} value={dog.id.toString()}>
                                                {dog.name} — {dog.breed}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Symptoms & Observations</Label>
                                <Textarea
                                    className="mt-1 bg-secondary/30 border-border/50 min-h-[140px]"
                                    placeholder="Describe symptoms... (e.g. 'Red patches on belly, scratching, lethargic')"
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex pt-2">
                        <Button
                            onClick={generateFIR}
                            disabled={!selectedDog || symptoms.length < 5 || loading}
                            className="gap-2 w-full md:w-auto px-8"
                        >
                            {loading ? "⏳ Analyzing Multimodal Data..." : "🚀 Generate Structured FIR"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Analysis UI */}
            {loading && (
                <Card className="glass border-primary/20 animate-pulse">
                    <CardContent className="p-12 text-center">
                        <div className="text-5xl mb-4 animate-bounce">🔬</div>
                        <h3 className="text-lg font-bold">Orchestrating AI Response</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Fusing vision analysis + symptoms + environment + allergy constraints
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {report && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <Card className={`glass ${urgStyle?.bg} border-border/50`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex justify-between items-center">
                                    <span>Triage Summary</span>
                                    <Badge className={`${urgStyle?.bg} ${urgStyle?.text} border-0`}>
                                        {urgStyle?.icon} {urgStyle?.label}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Observations</h4>
                                    <p className="text-sm leading-relaxed">{report.observations}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Non-Diagnostic Concerns</h4>
                                    <p className="text-sm font-medium">{report.possible_concerns}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Explanation Card */}
                        <Card className="glass border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">🧠 Reasoning Explanation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground italic leading-relaxed">"{report.explanation}"</p>
                            </CardContent>
                        </Card>

                        <Card className="glass border-amber-500/10">
                            <CardContent className="p-4 text-center">
                                <p className="text-[10px] text-muted-foreground font-mono">⚠️ {report.disclaimer}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Context Fusion Card */}
                        <Card className="glass border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">🔗 Data Fusion context</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        className={`p-3 rounded-lg ${report.allergy_trigger_detected ? 'bg-rose-500/10 border-rose-500/20' : 'bg-secondary/30'} border cursor-help`}
                                        title="⚠️ Cross-Referenced: The AI compared symptoms against known medical allergens in the database."
                                    >
                                        <p className="text-[10px] uppercase text-muted-foreground">Allergy Alerts</p>
                                        <p className={`text-xs font-bold mt-1 ${report.allergy_trigger_detected ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {report.allergy_trigger_detected ? '⚠️ TRIGGERS DETECTED' : '✅ NO RELEVANT TRIGGERS'}
                                        </p>
                                    </div>
                                    <div
                                        className="p-3 rounded-lg bg-secondary/30 border border-border/50 cursor-help"
                                        title="🌍 Environmental Influence: This score reflects how much local air quality and weather are contributing to the observed symptoms."
                                    >
                                        <p className="text-[10px] uppercase text-muted-foreground">Environment Risk</p>
                                        <p className="text-xs font-bold mt-1 uppercase">{report.risk_level}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Environmental Summary</h4>
                                    <p className="text-xs text-muted-foreground">{report.environmental_summary}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                            <div className="bg-primary/10 p-4 border-b border-white/5">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">Next Steps</h3>
                            </div>
                            <div className="p-6 bg-secondary/20 space-y-4">
                                <p className="text-sm">Based on the FIR evidence, we recommend:</p>
                                <ul className="text-xs space-y-2 text-muted-foreground">
                                    <li className="flex gap-2">🔹 Monitor vital signs every 4 hours.</li>
                                    <li className="flex gap-2">🔹 Avoid exposure to environmental triggers identified.</li>
                                    <li className="flex gap-2">🔹 Contact your vet with this report for professional triaging.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty / Error */}
            {!report && !loading && (
                <Card className={`glass border-border/50 ${error ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                    <CardContent className="p-20 text-center">
                        {error ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="text-5xl mb-4 p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">⚠</div>
                                <h3 className="text-xl font-medium mb-2 text-amber-400">Unable to complete full analysis</h3>
                                <p className="text-sm text-slate-300 max-w-[280px] mb-6">{error}</p>
                                <Button onClick={generateFIR} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 w-full md:w-auto shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                    🔄 Retry Connection
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className="text-xl font-medium mb-2">Diagnostic FIR Generation</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Submit symptoms and optional photos for a hybrid AI assessment combining medical rules with environmental risk data.
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
