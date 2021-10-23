<?php

namespace Pterodactyl\Transformers\Api\Application;

use Pterodactyl\Models\Egg;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Transformers\Api\Transformer;

class EggTransformer extends Transformer
{
    /**
     * Relationships that can be loaded onto this transformation.
     *
     * @var array
     */
    protected $availableIncludes = [
        'nest',
        'servers',
        'config',
        'script',
        'variables',
    ];

    public function getResourceName(): string
    {
        return Egg::RESOURCE_NAME;
    }

    public function transform(Egg $model): array
    {
        return [
            'id' => $model->id,
            'uuid' => $model->uuid,
            'name' => $model->name,
            'nest' => $model->nest_id,
            'author' => $model->author,
            'description' => $model->description,
            // "docker_image" is deprecated, but left here to avoid breaking too many things at once
            // in external software. We'll remove it down the road once things have gotten the chance
            // to upgrade to using "docker_images".
            'docker_image' => count($model->docker_images) > 0 ? $model->docker_images[0] : '',
            'docker_images' => $model->docker_images,
            'config' => [
                'files' => json_decode($model->config_files),
                'startup' => json_decode($model->config_startup),
                'stop' => $model->config_stop,
                'file_denylist' => $model->file_denylist,
                'extends' => $model->config_from,
            ],
            'startup' => $model->startup,
            'script' => [
                'privileged' => $model->script_is_privileged,
                'install' => $model->script_install,
                'entry' => $model->script_entry,
                'container' => $model->script_container,
                'extends' => $model->copy_script_from,
            ],
            'created_at' => self::formatTimestamp($model->created_at),
            'updated_at' => self::formatTimestamp($model->updated_at),
        ];
    }

    /**
     * Include the Nest relationship for the given Egg in the transformation.
     *
     * @return \League\Fractal\Resource\Item|\League\Fractal\Resource\NullResource
     */
    public function includeNest(Egg $model)
    {
        if (!$this->authorize(AdminAcl::RESOURCE_NESTS)) {
            return $this->null();
        }

        return $this->item($model->nest, new NestTransformer());
    }

    /**
     * Include the Servers relationship for the given Egg in the transformation.
     *
     * @return \League\Fractal\Resource\Collection|\League\Fractal\Resource\NullResource
     */
    public function includeServers(Egg $model)
    {
        if (!$this->authorize(AdminAcl::RESOURCE_SERVERS)) {
            return $this->null();
        }

        return $this->collection($model->servers, new ServerTransformer());
    }

    /**
     * Include more detailed information about the configuration if this Egg is
     * extending another.
     *
     * @return \League\Fractal\Resource\Item|\League\Fractal\Resource\NullResource
     */
    public function includeConfig(Egg $model)
    {
        if (is_null($model->config_from)) {
            return $this->null();
        }

        return $this->item($model, function (Egg $model) {
            return [
                'files' => json_decode($model->inherit_config_files),
                'startup' => json_decode($model->inherit_config_startup),
                'stop' => $model->inherit_config_stop,
            ];
        });
    }

    /**
     * Include more detailed information about the script configuration if the
     * Egg is extending another.
     *
     * @return \League\Fractal\Resource\Item|\League\Fractal\Resource\NullResource
     */
    public function includeScript(Egg $model)
    {
        if (is_null($model->copy_script_from)) {
            return $this->null();
        }

        return $this->item($model, function (Egg $model) {
            return [
                'privileged' => $model->script_is_privileged,
                'install' => $model->copy_script_install,
                'entry' => $model->copy_script_entry,
                'container' => $model->copy_script_container,
            ];
        });
    }

    /**
     * Include the variables that are defined for this Egg.
     *
     * @return \League\Fractal\Resource\Collection|\League\Fractal\Resource\NullResource
     */
    public function includeVariables(Egg $model)
    {
        if (!$this->authorize(AdminAcl::RESOURCE_EGGS)) {
            return $this->null();
        }

        return $this->collection($model->variables, new EggVariableTransformer());
    }
}
