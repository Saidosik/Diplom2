<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('solutions', function (Blueprint $table) {
            if (! Schema::hasColumn('solutions', 'mode')) {
                $table->string('mode', 20)->default('submission')->after('coding_task_id');
            }

            if (! Schema::hasColumn('solutions', 'stdin')) {
                $table->text('stdin')->nullable()->after('content');
            }

            if (! Schema::hasColumn('solutions', 'stdout')) {
                $table->text('stdout')->nullable()->after('stdin');
            }

            if (! Schema::hasColumn('solutions', 'stderr')) {
                $table->text('stderr')->nullable()->after('stdout');
            }

            if (! Schema::hasColumn('solutions', 'exit_code')) {
                $table->integer('exit_code')->nullable()->after('stderr');
            }

            if (! Schema::hasColumn('solutions', 'passed_tests_count')) {
                $table->unsignedInteger('passed_tests_count')->default(0)->after('exit_code');
            }

            if (! Schema::hasColumn('solutions', 'total_tests_count')) {
                $table->unsignedInteger('total_tests_count')->default(0)->after('passed_tests_count');
            }

            if (! Schema::hasColumn('solutions', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('total_tests_count');
            }

            if (! Schema::hasColumn('solutions', 'finished_at')) {
                $table->timestamp('finished_at')->nullable()->after('started_at');
            }
        });

        Schema::table('solutions', function (Blueprint $table) {
            try {
                $table->index(['user_id', 'coding_task_id', 'mode']);
            } catch (Throwable) {
                // index may already exist on repeated patch application
            }
        });
    }

    public function down(): void
    {
        Schema::table('solutions', function (Blueprint $table) {
            foreach ([
                'mode',
                'stdin',
                'stdout',
                'stderr',
                'exit_code',
                'passed_tests_count',
                'total_tests_count',
                'started_at',
                'finished_at',
            ] as $column) {
                if (Schema::hasColumn('solutions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
