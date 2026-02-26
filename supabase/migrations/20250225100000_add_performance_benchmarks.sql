-- Performance benchmarks for 1RM and percentage prescription.
-- Stored as JSONB; structure see lib/profile/benchmarkSchema.ts

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS performance_benchmarks jsonb DEFAULT '{}';

COMMENT ON COLUMN profiles.performance_benchmarks IS 'exerciseBenchmarks, aerobicBenchmarks, powerBenchmarks per benchmarkSchema';
