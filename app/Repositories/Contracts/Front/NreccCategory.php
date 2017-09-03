<?php

namespace App\Repositories\Contracts\Front;


interface NreccCategory
{

    /**
     * Get Data
     * @param $params
     * @return mixed
     */
    public function getData($params);

    /**
     * Get Data List
     * @param $params
     * @return mixed
     */
    public function getDataWithListInstitution($params);

    /**
     * Get Data List
     * @param $params
     * @return mixed
     */
    public function getDetailDataWithListInstitution($slug);

}