import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { getSkillHeatmap } from '../services/api';
import { COLLEGES, SKILLS_CATALOG } from '../data/constants';
import { MapPin, TrendingDown, BarChart3, Users, Zap } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './Heatmap.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Heatmap() {
    const { t, lang } = useI18n();
    const [college, setCollege] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState(null); // { x, y, skill, count, avg, cat }

    useEffect(() => {
        setLoading(true);
        getSkillHeatmap(college || null).then(d => { setData(d || []); setLoading(false); });
    }, [college]);

    const getSkillName = (sid) => {
        const s = SKILLS_CATALOG.find(x => x.id === sid);
        return s ? (lang === 'ar' ? s.ar : s.en) : sid;
    };

    // ── Build enriched skill map ─────────────────────────
    // heatmap.php returns: { skill_id, user_count, avg_proficiency, college_key }
    // When no college filter: multiple rows for same skill (one per college) → sum user_count, avg avg_proficiency
    const skillMap = {};
    data.forEach(row => {
        const sid = row.skill_id;
        if (!skillMap[sid]) {
            skillMap[sid] = { count: 0, profSum: 0, profRows: 0 };
        }
        skillMap[sid].count += parseInt(row.user_count || row.count || 0);
        const prof = parseFloat(row.avg_proficiency);
        if (!isNaN(prof)) {
            skillMap[sid].profSum += prof;
            skillMap[sid].profRows += 1;
        }
    });

    const sortedSkills = Object.entries(skillMap)
        .map(([sid, { count, profSum, profRows }]) => {
            const catalog = SKILLS_CATALOG.find(s => s.id === sid);
            if (!catalog) return null;
            return {
                sid,
                count,
                avgProf: profRows > 0 ? profSum / profRows : 0,
                skill: catalog,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.count - a.count);

    const maxCount = sortedSkills[0]?.count || 1;
    const totalStudentSkillEntries = sortedSkills.reduce((s, x) => s + x.count, 0);

    // ── Bar chart (top 15) ──────────────────────────────
    const top15 = sortedSkills.slice(0, 15);

    // Color each bar by avg proficiency level (amber → teal → blue)
    const barColors = top15.map(s => {
        if (s.avgProf >= 4) return 'rgba(59, 130, 246, 0.8)';   // advanced → blue
        if (s.avgProf >= 2.5) return 'rgba(20, 184, 166, 0.8)'; // mid → teal
        if (s.avgProf > 0) return 'rgba(251, 191, 36, 0.8)';    // low → amber
        return 'rgba(59, 130, 246, 0.65)';                       // no proficiency data
    });

    const barData = {
        labels: top15.map(s => lang === 'ar' ? s.skill.ar : s.skill.en),
        datasets: [{
            label: lang === 'ar' ? 'طلاب' : 'Students',
            data: top15.map(s => s.count),
            backgroundColor: barColors,
            borderColor: barColors.map(c => c.replace('0.8', '1').replace('0.65', '1')),
            borderWidth: 1,
            borderRadius: 6,
        }],
    };

    const barOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const sk = top15[ctx.dataIndex];
                        const profLine = sk.avgProf > 0
                            ? ` · ${lang === 'ar' ? 'متوسط الكفاءة' : 'Avg Proficiency'}: ${sk.avgProf.toFixed(1)}/5`
                            : '';
                        return ` ${ctx.raw} ${lang === 'ar' ? 'طالب' : 'students'}${profLine}`;
                    },
                    afterLabel: (ctx) => {
                        const sk = top15[ctx.dataIndex];
                        const cat = lang === 'ar' ? sk.skill.cat_ar : sk.skill.cat_en;
                        return ` ${lang === 'ar' ? 'التصنيف' : 'Category'}: ${cat}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
                title: { display: true, text: lang === 'ar' ? 'عدد الطلاب' : 'Number of Students', color: '#64748b', font: { size: 11 } },
            },
            y: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 11 } },
            },
        },
    };

    // ── Category doughnut ───────────────────────────────
    const catCounts = {};
    sortedSkills.forEach(({ skill, count }) => {
        const cat = lang === 'ar' ? skill.cat_ar : skill.cat_en;
        catCounts[cat] = (catCounts[cat] || 0) + count;
    });
    const catColors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a78bfa', '#06b6d4', '#f97316', '#ec4899'];
    const doughnutData = {
        labels: Object.keys(catCounts),
        datasets: [{
            data: Object.values(catCounts),
            backgroundColor: catColors,
            borderColor: 'transparent',
            borderWidth: 0,
            hoverBorderWidth: 0,
        }],
    };
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        elements: { arc: { borderWidth: 0 } },
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 10, useBorderRadius: true, borderRadius: 3 },
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const val = ctx.raw;
                        const pct = totalStudentSkillEntries > 0
                            ? ((val / totalStudentSkillEntries) * 100).toFixed(1)
                            : 0;
                        return ` ${val} ${lang === 'ar' ? 'إدخال' : 'entries'} (${pct}%)`;
                    },
                },
            },
        },
        cutout: '65%',
    };

    // ── Skill gaps ──────────────────────────────────────
    // A skill is "rare" if it has fewer than 10% of maxCount students (adaptive threshold)
    const gapThreshold = Math.max(3, Math.ceil(maxCount * 0.1));
    const gaps = SKILLS_CATALOG
        .map(s => ({ skill: s, count: skillMap[s.id]?.count || 0, avgProf: skillMap[s.id] ? (skillMap[s.id].profSum / (skillMap[s.id].profRows || 1)) : 0 }))
        .filter(g => g.count < gapThreshold)
        .sort((a, b) => a.count - b.count)
        .slice(0, 12);

    const gapMax = gaps.reduce((m, g) => Math.max(m, g.count), 1);

    // Proficiency bar color helper
    const profColor = (avg) => {
        if (avg >= 4) return '#3b82f6';
        if (avg >= 2.5) return '#14b8a6';
        if (avg > 0) return '#fbbf24';
        return '#3b82f6';
    };

    return (
        <div className="heatmap-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('heatmap_title')}</h1>
                    <p className="page-subtitle">{t('heatmap_subtitle')}</p>
                </div>
            </div>

            {/* Filter + Stats row */}
            <div className="heatmap-topbar">
                <div className="heatmap-filter">
                    <MapPin size={16} />
                    <select value={college} onChange={e => setCollege(e.target.value)}>
                        <option value="">{t('all')} {t('select_college_heatmap')}</option>
                        {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                    </select>
                </div>
                {!loading && data.length > 0 && (
                    <div className="heatmap-kpi-row">
                        <div className="heatmap-kpi">
                            <Users size={14} />
                            <span>{sortedSkills.length} {lang === 'ar' ? 'مهارة' : 'skills'}</span>
                        </div>
                        <div className="heatmap-kpi">
                            <Zap size={14} />
                            <span>{sortedSkills[0] ? (lang === 'ar' ? sortedSkills[0].skill.ar : sortedSkills[0].skill.en) : '—'} #{1}</span>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-state"><div className="spinner" /></div>
            ) : data.length === 0 ? (
                <div className="empty-state"><MapPin size={48} /><h3>{t('no_projects_found')}</h3></div>
            ) : (
                <>
                    {/* Charts Grid — Bar + Doughnut */}
                    <div className="heatmap-charts-grid">
                        <div className="heatmap-chart-card">
                            <div className="heatmap-chart-header">
                                <h3 className="heatmap-chart-title"><BarChart3 size={16} /> {t('top_skills')}</h3>
                                <div className="heatmap-prof-legend">
                                    <span style={{ color: '#fbbf24' }}>● {lang === 'ar' ? 'مبتدئ' : 'Beginner'}</span>
                                    <span style={{ color: '#14b8a6' }}>● {lang === 'ar' ? 'متوسط' : 'Intermediate'}</span>
                                    <span style={{ color: '#3b82f6' }}>● {lang === 'ar' ? 'متقدم' : 'Advanced'}</span>
                                </div>
                            </div>
                            <div className="heatmap-chart-wrap">
                                <Bar data={barData} options={barOptions} />
                            </div>
                        </div>
                        <div className="heatmap-chart-card">
                            <h3 className="heatmap-chart-title">{lang === 'ar' ? 'التخصصات' : 'By Category'}</h3>
                            <div className="heatmap-chart-wrap heatmap-chart-wrap--doughnut">
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Skill Gaps */}
                    {gaps.length > 0 && (
                        <div className="heatmap-section-card">
                            <div className="heatmap-chart-header">
                                <h3 className="heatmap-chart-title">
                                    <TrendingDown size={16} /> {t('skill_gaps')}
                                </h3>
                                <span className="heatmap-gap-threshold">
                                    {lang === 'ar' ? `أقل من ${gapThreshold} طلاب` : `< ${gapThreshold} students`}
                                </span>
                            </div>
                            <div className="heatmap-gaps-grid">
                                {gaps.map((g, i) => (
                                    <div key={i} className="heatmap-gap-item">
                                        <div className="heatmap-gap-name">{lang === 'ar' ? g.skill.ar : g.skill.en}</div>
                                        <div className="heatmap-gap-meta">
                                            <span className="heatmap-gap-count">{g.count} {lang === 'ar' ? 'طالب' : 'students'}</span>
                                            {g.avgProf > 0 && (
                                                <span className="heatmap-gap-prof" style={{ color: profColor(g.avgProf) }}>
                                                    ★ {g.avgProf.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="heatmap-gap-bar">
                                            <div
                                                className="heatmap-gap-fill"
                                                style={{ width: `${Math.max((g.count / gapMax) * 100, 3)}%` }}
                                            />
                                        </div>
                                        <div className="heatmap-gap-cat">{lang === 'ar' ? g.skill.cat_ar : g.skill.cat_en}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Full Heatmap Grid */}
                    <div className="heatmap-section-card">
                        <div className="heatmap-chart-header">
                            <h3 className="heatmap-chart-title">{lang === 'ar' ? 'جميع المهارات' : 'All Skills'}</h3>
                            <div className="heatmap-legend">
                                <span className="heatmap-legend-label">{lang === 'ar' ? 'أقل' : 'Fewer'}</span>
                                <div className="heatmap-legend-scale">
                                    {[0.15, 0.35, 0.55, 0.75, 1].map((v, i) => (
                                        <div key={i} className="heatmap-legend-swatch" style={{ opacity: 0.3 + v * 0.7 }} />
                                    ))}
                                </div>
                                <span className="heatmap-legend-label">{lang === 'ar' ? 'أكثر' : 'More'}</span>
                            </div>
                        </div>
                        <div className="heatmap-full-grid">
                            {sortedSkills.map((s, i) => {
                                const pct = s.count / maxCount;
                                const cat = lang === 'ar' ? s.skill.cat_ar : s.skill.cat_en;
                                const profPct = s.avgProf > 0 ? (s.avgProf / 5) * 100 : null;
                                return (
                                    <div
                                        key={i}
                                        className="heatmap-full-row animate-fade-in"
                                        style={{ animationDelay: `${Math.min(i * 0.015, 0.4)}s` }}
                                        title={`${lang === 'ar' ? s.skill.ar : s.skill.en} · ${s.count} ${lang === 'ar' ? 'طالب' : 'students'}${s.avgProf > 0 ? ` · ${lang === 'ar' ? 'كفاءة' : 'Proficiency'}: ${s.avgProf.toFixed(1)}/5` : ''}`}
                                    >
                                        <span className="heatmap-full-name">{lang === 'ar' ? s.skill.ar : s.skill.en}</span>
                                        <div className="heatmap-full-bar-track">
                                            <div
                                                className="heatmap-full-bar-fill"
                                                style={{
                                                    width: `${Math.max(pct * 100, 1)}%`,
                                                    opacity: 0.35 + pct * 0.65,
                                                }}
                                            />
                                            {profPct !== null && (
                                                <div
                                                    className="heatmap-full-bar-prof"
                                                    style={{
                                                        width: `${Math.max(pct * 100, 1)}%`,
                                                        '--prof-w': `${profPct}%`,
                                                    }}
                                                />
                                            )}
                                            <span className="heatmap-full-bar-count">{s.count}</span>
                                        </div>
                                        <div className="heatmap-full-right">
                                            {s.avgProf > 0 && (
                                                <span className="heatmap-full-prof" style={{ color: profColor(s.avgProf) }}>
                                                    {s.avgProf.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
