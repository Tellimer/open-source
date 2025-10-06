# V2 Review Features

The V2 pipeline includes two powerful review features for quality control and auditing of classifications.

## Overview

| Feature | Purpose | Auto-Fix | Output |
|---------|---------|----------|--------|
| `review:all` | Review and fix all classifications | ✅ Yes | Applies fixes automatically |
| `review:all-flag` | Audit all classifications | ❌ No | Flags issues for human review |

---

## 1. Review:All (Auto-Fix)

**Purpose**: Review all classifications and automatically apply fixes when issues are found.

### Usage

```bash
deno task review:all
```

### Configuration

```bash
# Required: API Key
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...

# Optional: Model/Provider Configuration
export REVIEW_PROVIDER=anthropic                    # openai, anthropic (default: openai)
export REVIEW_MODEL=claude-sonnet-4-5-20250929     # Model to use (default: gpt-5)
export CLASSIFY_DB=./data/classify_v2.db           # Database path (default shown)
```

### How It Works

1. **Read All Classifications** - Fetches every classification from database
2. **Create Synthetic Flags** - Marks all indicators with "review_all" flag
3. **LLM Review** - Reviews each classification in batches
4. **Auto-Apply Fixes** - Automatically fixes issues found
5. **Output Results** - Shows counts of reviewed/fixed/escalated

### Review Actions

- **confirm**: Classification is correct → no change
- **fix**: Error found → **automatically applies correction**
- **escalate**: Uncertain → marks for human review

### Example Output

```
Review-all complete.
  • Reviewed: 1000
  • Fixed: 47
  • Escalated: 3
```

### Use Cases

✅ **After Prompt Improvements** - Apply new logic to historical data
```bash
REVIEW_MODEL=claude-sonnet-4-5-20250929 deno task review:all
```

✅ **Migration/Upgrades** - Fix classifications after system changes

✅ **Bulk Corrections** - Fix systematic errors across entire dataset

---

## 2. Review:All-Flag (Audit Mode)

**Purpose**: Review all classifications and flag issues WITHOUT auto-fixing. Creates a list of issues for human oversight.

### Usage

```bash
deno task review:all-flag
```

### Configuration

Same as `review:all`:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export REVIEW_PROVIDER=anthropic
export REVIEW_MODEL=claude-sonnet-4-5-20250929
```

### How It Works

1. **Read All Classifications** - Fetches every classification from database
2. **Create Synthetic Flags** - Marks all with "review_all_flag" flag
3. **LLM Review** - Reviews each classification in batches
4. **Flag Issues** - **Saves issues to database WITHOUT applying fixes**
5. **Generate Report** - Shows detailed issue list

### Review Actions

- **confirm**: Classification is correct → no flag created
- **fix**: Error found → **creates "review_suggested_fix" flag** (no auto-fix)
- **escalate**: Uncertain → **creates "review_escalation" flag**

### Example Output

```
============================================================
📋 REVIEW-ALL-FLAG SUMMARY
============================================================
Total Reviewed:        100
✅ Confirmed Correct:   68
🔧 Flagged for Fix:    28
⚠️  Flagged for Review: 4
============================================================

🚩 FLAGGED ISSUES:

1. CPI Trimmed-Mean (CANCPITRI)
   Type: needs_fix
   Reason: Should be change-movement/rate, not composite-derived/index
   Suggested Fix: {"family":"change-movement","indicator_type":"rate"}
   Confidence: 92%

2. Manufacturing PMI (AUSTRALIAMANPMI)
   Type: needs_fix
   Reason: Temporal should be point-in-time for PMI indices
   Suggested Fix: {"temporal_aggregation":"point-in-time"}
   Confidence: 88%

3. Government Spending to GDP (AFGHANISTAGSTG)
   Type: needs_escalation
   Reason: Ambiguous - could be flow or ratio depending on context
   Confidence: 65%

💡 Issues have been flagged in the database for human review.
   Run a query on flagging_results table to see all flags.
```

### Querying Flagged Issues

```sql
-- See all flagged issues
SELECT
  indicator_id,
  flag_type,
  flag_reason,
  current_value,
  flagged_at
FROM flagging_results
WHERE flag_type IN ('review_suggested_fix', 'review_escalation')
ORDER BY flagged_at DESC;

-- Get flagged indicators with details
SELECT
  f.indicator_id,
  c.name,
  f.flag_type,
  f.flag_reason,
  f.current_value as suggested_fix,
  c.family,
  c.indicator_type
FROM flagging_results f
JOIN classifications c ON f.indicator_id = c.indicator_id
WHERE f.flag_type IN ('review_suggested_fix', 'review_escalation');
```

### Use Cases

✅ **Quality Audit** - Review all data without making changes
```bash
REVIEW_MODEL=claude-sonnet-4-5-20250929 deno task review:all-flag
```

✅ **Pre-Migration Check** - Identify issues before applying fixes

✅ **Human Oversight** - Generate list for manual review and approval

✅ **Model Comparison** - Run with different models to compare suggestions

---

## Comparison: When to Use Which?

### Use `review:all` when:
- ✅ You trust the review model to make corrections
- ✅ You want to fix issues automatically
- ✅ You've improved prompts and want to apply fixes to historical data
- ✅ You want a quick cleanup of systematic errors

### Use `review:all-flag` when:
- ✅ You want human oversight before making changes
- ✅ You're auditing quality without committing to fixes
- ✅ You want to compare multiple review models' suggestions
- ✅ You need a report of issues for stakeholders
- ✅ You're not sure if auto-fixes are safe

---

## Advanced Usage

### Running Both in Sequence

```bash
# 1. First audit (no changes)
deno task review:all-flag

# 2. Review flagged issues manually
sqlite3 ./data/classify_v2.db "SELECT * FROM flagging_results WHERE flag_type LIKE 'review_%'"

# 3. Then apply fixes if confident
deno task review:all
```

### Custom Models for Different Stages

```bash
# Use GPT-5 for flagging (audit)
REVIEW_PROVIDER=openai REVIEW_MODEL=gpt-5 deno task review:all-flag

# Use Claude for actual fixes (conservative)
REVIEW_PROVIDER=anthropic REVIEW_MODEL=claude-sonnet-4-5-20250929 deno task review:all
```

### Integration with CI/CD

```yaml
# .github/workflows/quality-audit.yml
- name: Quality Audit
  run: |
    export ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}
    deno task review:all-flag

- name: Check for Issues
  run: |
    ISSUES=$(sqlite3 ./data/classify_v2.db "SELECT COUNT(*) FROM flagging_results WHERE flag_type LIKE 'review_%'")
    if [ "$ISSUES" -gt "0" ]; then
      echo "::warning::Found $ISSUES classification issues"
    fi
```

---

## Database Schema

### Flagging Results Table

```sql
CREATE TABLE flagging_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,           -- 'review_suggested_fix' or 'review_escalation'
  flag_reason TEXT NOT NULL,
  current_value TEXT,                -- JSON with suggested fix
  expected_value TEXT,
  flagged_at TEXT NOT NULL,
  FOREIGN KEY (indicator_id) REFERENCES classifications(indicator_id)
);
```

### Flag Types

- `review_all` - Synthetic flag for review:all (auto-fix mode)
- `review_all_flag` - Synthetic flag for review:all-flag (audit mode)
- `review_suggested_fix` - Issue flagged with suggested fix (no auto-apply)
- `review_escalation` - Uncertain issue flagged for human review

---

## Best Practices

1. **Start with Audit Mode** - Always run `review:all-flag` first to see what would change
2. **Review High-Confidence Fixes** - Focus on fixes with >85% confidence
3. **Escalate Low-Confidence** - Have humans review anything <70% confidence
4. **Use Strong Models** - Use Claude Sonnet 4.5 or GPT-5 for review
5. **Version Control** - Keep database backups before running auto-fixes
6. **Monitor Costs** - Review features use API calls - monitor token usage

---

## Troubleshooting

### No issues found but expected some

- Check if classifications are already correct
- Try a different/stronger review model
- Verify database has classifications to review

### Too many false positives

- Increase batch size for better context
- Use a more capable model (GPT-5, Claude Sonnet 4.5)
- Review and improve review stage prompts

### Auto-fixes making wrong changes

- Switch to `review:all-flag` for auditing
- Review flagged issues manually
- Improve review stage prompts
- Use more conservative model

---

## Future Enhancements

Potential improvements:

- [ ] Confidence threshold filtering
- [ ] Dry-run mode for review:all
- [ ] Export flagged issues to CSV/JSON
- [ ] Batch approval workflow for flagged issues
- [ ] Review history tracking
- [ ] A/B testing different review models
