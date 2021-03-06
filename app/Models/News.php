<?php

namespace App\Models;

use App\Models\BaseModel;

class News extends BaseModel
{
	protected $table = 'news';
    public $timestamps = false;

    protected $fillable = [
        'thumbnail',
        'slug',
        'order',
	    'created_at', 
	    'updated_by',
        'is_active'
    ];

    protected $guarded = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function translations()
    {
        return $this->hasMany('App\Models\NewsTrans', 'news_id', 'id');
    }

    /**
     * @return mixed
     */
    public function translation()
    {
        return $this->belongsTo('App\Models\NewsTrans', 'id', 'news_id')->where('locale', '=' , $this->getCurrentLocalize());
    }

    /**
     * @return mixed
     */
    public function related()
    {
        return $this->hasMany('App\Models\NewsRelated', 'news_id', 'id')->with('related_news')->take('3')->orderBy('news_related_id', 'random');
    }

    /**
     * @return mixed
     */
    public function tags()
    {
        return $this->belongsTo('App\Models\Tag', 'tag_id', 'id')->with('translation');
    }

    /**
     * @return mixed
     */
    public function news_images()
    {
        return $this->hasMany('App\Models\NewsImages', 'news_id', 'id');
    }

    /***************** Scope *****************/

    /**
     * @param $query
     */
    public function scopeIsActive($query, $params = true)
    {
        return $query->where('is_active', $params);
    }


    /**
     * @param $query
     */
    public function scopePopular($query, $params)
    {
        return $query->where('total_view', '>', $params);
    }

    /**
     * @param $query
     */
    public function scopeId($query, $params)
    {
        return $query->where('id', $params);
    }
}