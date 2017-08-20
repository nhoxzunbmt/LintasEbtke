<?php

namespace App\Http\Controllers\Ebtke\Sipeda;

use Illuminate\Http\Request;
use App\Http\Controllers\SipedaBaseController;
use App\Custom\SipedaDataHelper;
use App\Services\Bridge\Sipeda\Provinsi as ProvinsiServices;
use App\Services\Bridge\Sipeda\Kabupaten as KabupatenServices;
use App\Services\Bridge\Sipeda\InvestasiPabrikanAnekaEbt as InvestasiPabrikanAnekaEbtServices;
use App\Services\Api\Response as ResponseService;

use Validator;
use ValidatesRequests;
use Response;
use Session;
use Auth;

class InvestasiPabrikanAnekaEbtController extends SipedaBaseController
{

    protected $response;
    protected $validationMessage = '';
    protected $provinsi;
    protected $kabupaten;
    protected $investasiPabrikanAnekaEbt;

    public function __construct(ProvinsiServices $provinsi, KabupatenServices $kabupaten, InvestasiPabrikanAnekaEbtServices $investasiPabrikanAnekaEbt, ResponseService $response)
    {
        $this->response = $response;
        $this->provinsi = $provinsi;
        $this->kabupaten = $kabupaten;
        $this->investasiPabrikanAnekaEbt = $investasiPabrikanAnekaEbt;
    }

    /**
     * Index Of Energy Conservation
     * @return string
     */
    public function index(Request $request)
    {
        $blade = self::URL_BLADE_SIPEDA. '.investasi-pabrikan-aneka-ebt.main';
        
        if(view()->exists($blade)) {
        
            return view($blade);

        }

        return abort(404);

    }


    /**
     * Get Data 
     * @return string
     */

    public function getData(Request $request)
    {
        $data['provinsi'] = $this->provinsi->getData();
        $data['kabupaten'] = $this->kabupaten->getData();
        $data['investasi_pabrikan'] = $this->investasiPabrikanAnekaEbt->getData();

        return $this->response->setResponse(trans('message.success_get_data'), true, $data);
    }

    /**
     * Get data kabupaten by provinsi id
     * @param $id
     * @return array
     */

    public function getDataKabupatenByProvinsi(Request $request)
    {
        return $this->kabupaten->getDataByProvinsi($request->except(['_token']));
    }

    /**
     * Store Data
     * @param Request $request
     */

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->validationStore($request));

        if ($validator->fails()) {
            //TODO: case fail
            return $this->response->setResponseErrorFormValidation($validator->messages(), false);

        } else {
            //TODO: case pass
            return $this->investasiPabrikanAnekaEbt->store($request->except(['_token']));
        }

    }


    /**
     * Validation Store Landing Offers
     * @return array
     */
    private function validationStore($request = array())
    {
        $rules = [
            'nama_produk'                => 'required',
            'sumber_dana'                => 'required',
            'provinsi_id'                => 'required',
            'kabupaten_id'               => 'required',
            'latitude'                   => 'required',
            'longitude'                  => 'required',
            'kapasitas_produksi'         => 'required',
            'satuan_kapasitas_produksi'  => 'required',
            'tahun_investasi'            => 'required',
            'penambahan_kapasitas'       => 'required',
            'penambahan_kapasitas'       => 'required',
            'peningkatan_efisiensi'      => 'required',
            'rencana_investasi'          => 'required',
            'realisasi_investasi'        => 'required',
        ];

        return $rules;
    }
}