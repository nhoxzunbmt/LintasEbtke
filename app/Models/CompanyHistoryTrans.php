<?php

namespace App\Models;

use App\Models\BaseModel;

/**
 * Class News Trans
 */
class CompanyHistoryTrans extends BaseModel
{
    protected $table = 'company_history_trans';

    public $timestamps = true;

    protected $fillable = [
        'locale',
    ];

    protected $guarded = [];

        
}