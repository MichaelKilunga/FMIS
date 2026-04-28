<?php

namespace App\Console\Commands;

use App\Services\RecurringBillService;
use Illuminate\Console\Command;

class ProcessRecurringBills extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fmis:process-recurring-bills';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process all due recurring bills and generate transactions';

    /**
     * Execute the console command.
     */
    public function handle(RecurringBillService $billService)
    {
        $this->info('Processing recurring bills...');
        
        $count = $billService->processDueBills();
        
        $this->info("Successfully processed {$count} bills.");
    }
}
